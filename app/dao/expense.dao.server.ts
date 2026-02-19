import currency from "currency.js";

import { db } from "~/db.server";

export interface Expense {
  id: number;
  group_id: number;
  paid_by_member_id: number;
  added_by_member_id: number | null;
  description: string;
  amount: number; // cents
  created_at: string;
}

export interface ExpenseSplit {
  id: number;
  expense_id: number;
  member_id: number;
  amount: number; // cents
}

export interface ExpenseWithDetails extends Expense {
  paid_by_name: string;
  added_by_name: string | null;
  splits: (ExpenseSplit & { member_name: string })[];
}

export interface Balance {
  from_member_id: number;
  from_name: string;
  to_member_id: number;
  to_name: string;
  amount: number; // cents
}

export const ExpenseDAO = {
  async create(
    groupId: number,
    paidByMemberId: number,
    description: string,
    amountCents: number,
    splitAmongMemberIds: number[],
    addedByMemberId?: number | null
  ): Promise<Expense> {
    const total = currency(amountCents, { fromCents: true });
    const splitCount = splitAmongMemberIds.length;
    const perPerson = total.distribute(splitCount);

    const statements: { sql: string; args: any[] }[] = [
      {
        sql: "INSERT INTO expenses (group_id, paid_by_member_id, description, amount, added_by_member_id) VALUES (?, ?, ?, ?, ?) RETURNING *",
        args: [
          groupId,
          paidByMemberId,
          description,
          amountCents,
          addedByMemberId ?? null,
        ],
      },
    ];

    // We need the expense ID from the first statement, so we use a two-step approach
    const expenseResult = await db.execute({
      sql: "INSERT INTO expenses (group_id, paid_by_member_id, description, amount, added_by_member_id) VALUES (?, ?, ?, ?, ?) RETURNING *",
      args: [
        groupId,
        paidByMemberId,
        description,
        amountCents,
        addedByMemberId ?? null,
      ],
    });

    const expense = expenseResult.rows[0] as unknown as Record<
      string,
      unknown
    >;
    const expenseId = expense.id as number;

    const splitStatements = splitAmongMemberIds.map((memberId, i) => ({
      sql: "INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)",
      args: [expenseId, memberId, perPerson[i].intValue],
    }));

    if (splitStatements.length > 0) {
      await db.batch(splitStatements, "write");
    }

    return {
      id: expenseId,
      group_id: expense.group_id as number,
      paid_by_member_id: expense.paid_by_member_id as number,
      added_by_member_id: (expense.added_by_member_id as number) ?? null,
      description: expense.description as string,
      amount: expense.amount as number,
      created_at: expense.created_at as string,
    };
  },

  async findByGroupId(groupId: number): Promise<ExpenseWithDetails[]> {
    const expenseResult = await db.execute({
      sql: `SELECT e.*, m.name as paid_by_name, m2.name as added_by_name
            FROM expenses e
            JOIN members m ON m.id = e.paid_by_member_id
            LEFT JOIN members m2 ON m2.id = e.added_by_member_id
            WHERE e.group_id = ?
            ORDER BY e.created_at DESC`,
      args: [groupId],
    });

    const expenses: ExpenseWithDetails[] = [];

    for (const row of expenseResult.rows) {
      const r = row as unknown as Record<string, unknown>;
      const splitsResult = await db.execute({
        sql: `SELECT es.*, m.name as member_name
              FROM expense_splits es
              JOIN members m ON m.id = es.member_id
              WHERE es.expense_id = ?`,
        args: [r.id as number],
      });

      const splits = splitsResult.rows.map((s) => {
        const sr = s as unknown as Record<string, unknown>;
        return {
          id: sr.id as number,
          expense_id: sr.expense_id as number,
          member_id: sr.member_id as number,
          amount: sr.amount as number,
          member_name: sr.member_name as string,
        };
      });

      expenses.push({
        id: r.id as number,
        group_id: r.group_id as number,
        paid_by_member_id: r.paid_by_member_id as number,
        added_by_member_id: (r.added_by_member_id as number) ?? null,
        description: r.description as string,
        amount: r.amount as number,
        created_at: r.created_at as string,
        paid_by_name: r.paid_by_name as string,
        added_by_name: (r.added_by_name as string) ?? null,
        splits,
      });
    }

    return expenses;
  },

  async update(
    expenseId: number,
    description: string,
    amountCents: number,
    paidByMemberId: number,
    splitAmongMemberIds: number[]
  ): Promise<void> {
    const total = currency(amountCents, { fromCents: true });
    const perPerson = total.distribute(splitAmongMemberIds.length);

    await db.batch(
      [
        {
          sql: "UPDATE expenses SET description = ?, amount = ?, paid_by_member_id = ? WHERE id = ?",
          args: [description, amountCents, paidByMemberId, expenseId],
        },
        {
          sql: "DELETE FROM expense_splits WHERE expense_id = ?",
          args: [expenseId],
        },
        ...splitAmongMemberIds.map((memberId, i) => ({
          sql: "INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)",
          args: [expenseId, memberId, perPerson[i].intValue],
        })),
      ],
      "write"
    );
  },

  async delete(expenseId: number): Promise<void> {
    await db.batch(
      [
        {
          sql: "DELETE FROM expense_splits WHERE expense_id = ?",
          args: [expenseId],
        },
        {
          sql: "DELETE FROM expenses WHERE id = ?",
          args: [expenseId],
        },
      ],
      "write"
    );
  },

  /**
   * Calculate net balances for a group.
   * Returns a list of "A owes B $X" settlements.
   */
  async getBalances(groupId: number): Promise<Balance[]> {
    const result = await db.execute({
      sql: `SELECT
              m.id as member_id,
              m.name,
              COALESCE(paid.total_paid, 0) as total_paid,
              COALESCE(owed.total_owed, 0) as total_owed
            FROM members m
            LEFT JOIN (
              SELECT paid_by_member_id as mid, SUM(amount) as total_paid
              FROM expenses WHERE group_id = ?
              GROUP BY paid_by_member_id
            ) paid ON paid.mid = m.id
            LEFT JOIN (
              SELECT es.member_id as mid, SUM(es.amount) as total_owed
              FROM expense_splits es
              JOIN expenses e ON e.id = es.expense_id
              WHERE e.group_id = ?
              GROUP BY es.member_id
            ) owed ON owed.mid = m.id
            WHERE m.group_id = ?`,
      args: [groupId, groupId, groupId],
    });

    // net = what they paid minus what they owe
    // positive means others owe them, negative means they owe others
    const nets = result.rows.map((r) => {
      const row = r as unknown as Record<string, unknown>;
      return {
        memberId: row.member_id as number,
        name: row.name as string,
        net: (row.total_paid as number) - (row.total_owed as number),
      };
    });

    // Simplify debts: greedy algorithm
    const debtors = nets
      .filter((n) => n.net < 0)
      .map((n) => ({ ...n, remaining: -n.net }))
      .toSorted((a, b) => b.remaining - a.remaining);

    const creditors = nets
      .filter((n) => n.net > 0)
      .map((n) => ({ ...n, remaining: n.net }))
      .toSorted((a, b) => b.remaining - a.remaining);

    const balances: Balance[] = [];

    for (const debtor of debtors) {
      for (const creditor of creditors) {
        if (debtor.remaining <= 0) {
          break;
        }
        if (creditor.remaining <= 0) {
          continue;
        }

        const settleAmount = Math.min(debtor.remaining, creditor.remaining);
        if (settleAmount > 0) {
          balances.push({
            amount: settleAmount,
            from_member_id: debtor.memberId,
            from_name: debtor.name,
            to_member_id: creditor.memberId,
            to_name: creditor.name,
          });
          debtor.remaining -= settleAmount;
          creditor.remaining -= settleAmount;
        }
      }
    }

    return balances;
  },
};
