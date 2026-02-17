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
  create(
    groupId: number,
    paidByMemberId: number,
    description: string,
    amountCents: number,
    splitAmongMemberIds: number[],
    addedByMemberId?: number | null
  ): Expense {
    const total = currency(amountCents, { fromCents: true });
    const splitCount = splitAmongMemberIds.length;
    const perPerson = total.distribute(splitCount);

    return db.transaction(() => {
      const expense = db
        .prepare(
          "INSERT INTO expenses (group_id, paid_by_member_id, description, amount, added_by_member_id) VALUES (?, ?, ?, ?, ?) RETURNING *"
        )
        .get(
          groupId,
          paidByMemberId,
          description,
          amountCents,
          addedByMemberId ?? null
        ) as Expense;

      const insertSplit = db.prepare(
        "INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)"
      );

      for (let i = 0; i < splitAmongMemberIds.length; i++) {
        insertSplit.run(
          expense.id,
          splitAmongMemberIds[i],
          perPerson[i].intValue
        );
      }

      return expense;
    })();
  },

  findByGroupId(groupId: number): ExpenseWithDetails[] {
    const expenses = db
      .query(
        `SELECT e.*, m.name as paid_by_name, m2.name as added_by_name
         FROM expenses e
         JOIN members m ON m.id = e.paid_by_member_id
         LEFT JOIN members m2 ON m2.id = e.added_by_member_id
         WHERE e.group_id = ?
         ORDER BY e.created_at DESC`
      )
      .all(groupId) as (Expense & {
      paid_by_name: string;
      added_by_name: string | null;
    })[];

    return expenses.map((expense) => {
      const splits = db
        .query(
          `SELECT es.*, m.name as member_name
           FROM expense_splits es
           JOIN members m ON m.id = es.member_id
           WHERE es.expense_id = ?`
        )
        .all(expense.id) as (ExpenseSplit & { member_name: string })[];

      return { ...expense, splits };
    });
  },

  update(
    expenseId: number,
    description: string,
    amountCents: number,
    paidByMemberId: number,
    splitAmongMemberIds: number[]
  ): void {
    const total = currency(amountCents, { fromCents: true });
    const perPerson = total.distribute(splitAmongMemberIds.length);

    db.transaction(() => {
      db.prepare(
        "UPDATE expenses SET description = ?, amount = ?, paid_by_member_id = ? WHERE id = ?"
      ).run(description, amountCents, paidByMemberId, expenseId);

      db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(
        expenseId
      );

      const insertSplit = db.prepare(
        "INSERT INTO expense_splits (expense_id, member_id, amount) VALUES (?, ?, ?)"
      );

      for (let i = 0; i < splitAmongMemberIds.length; i++) {
        insertSplit.run(
          expenseId,
          splitAmongMemberIds[i],
          perPerson[i].intValue
        );
      }
    })();
  },

  delete(expenseId: number): void {
    db.transaction(() => {
      db.prepare("DELETE FROM expense_splits WHERE expense_id = ?").run(
        expenseId
      );
      db.prepare("DELETE FROM expenses WHERE id = ?").run(expenseId);
    })();
  },

  /**
   * Calculate net balances for a group.
   * Returns a list of "A owes B $X" settlements.
   */
  getBalances(groupId: number): Balance[] {
    // Calculate each member's net balance:
    // positive = they are owed money, negative = they owe money
    const rows = db
      .query(
        `SELECT
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
        WHERE m.group_id = ?`
      )
      .all(groupId, groupId, groupId) as {
      member_id: number;
      name: string;
      total_paid: number;
      total_owed: number;
    }[];

    // net = what they paid minus what they owe
    // positive means others owe them, negative means they owe others
    const nets = rows.map((r) => ({
      memberId: r.member_id,
      name: r.name,
      net: r.total_paid - r.total_owed,
    }));

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
