import { useHotkey } from "@tanstack/react-hotkeys";
import currency from "currency.js";
import { ArrowRightLeft, Users, Receipt } from "lucide-react";
import { useEffect, useRef } from "react";
import { data, Form, useNavigation } from "react-router";
import { sileo } from "sileo";

import type { Command } from "~/components/command-palette";
import type { ShortcutGroup } from "~/components/help-overlay";

import { useKeyboard } from "~/contexts/keyboard-context";
import { ExpenseDAO } from "~/dao/expense.dao.server";
import { GroupDAO } from "~/dao/group.dao.server";
import { MemberDAO } from "~/dao/member.dao.server";
import { cents } from "~/lib/currency";
import {
  parseRecentGroups,
  makeRecentGroupsCookie,
} from "~/lib/recent-groups.server";

import type { Route } from "./+types/member";

export function meta({ data }: Route.MetaArgs) {
  return [
    {
      title: `${data?.member?.name ?? "Member"} — ${data?.group?.name ?? "Group"} — SplitSend`,
    },
  ];
}

export async function action({ request, params }: Route.ActionArgs) {
  const group = GroupDAO.findBySlug(params.slug);
  if (!group) {
    throw new Response("Not Found", { status: 404 });
  }

  const member = MemberDAO.findByGroupIdAndToken(group.id, params.memberToken);
  if (!member) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add-expense") {
    const description = String(formData.get("description")).trim();
    const amountStr = String(formData.get("amount")).trim();
    const paidBy = Number(formData.get("paidBy"));
    const splitAmong = formData.getAll("splitAmong").map(Number);

    if (!description) {
      return { error: "Description is required" };
    }
    if (!amountStr) {
      return { error: "Amount is required" };
    }
    if (!paidBy) {
      return { error: "Select who paid" };
    }
    if (splitAmong.length === 0) {
      return { error: "Select at least one person to split with" };
    }

    const amountCents = currency(amountStr).intValue;
    if (amountCents <= 0) {
      return { error: "Amount must be greater than 0" };
    }

    ExpenseDAO.create(
      group.id,
      paidBy,
      description,
      amountCents,
      splitAmong,
      member.id
    );
    return { success: true };
  }

  return { error: "Unknown action" };
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const group = GroupDAO.findBySlug(params.slug);
  if (!group) {
    throw new Response("Not Found", { status: 404 });
  }

  const member = MemberDAO.findByGroupIdAndToken(group.id, params.memberToken);
  if (!member) {
    throw new Response("Not Found", { status: 404 });
  }

  const members = MemberDAO.findByGroupId(group.id);
  const expenses = ExpenseDAO.findByGroupId(group.id);
  const balances = ExpenseDAO.getBalances(group.id);

  const myBalances = balances.filter(
    (b) => b.from_member_id === member.id || b.to_member_id === member.id
  );

  const recent = parseRecentGroups(request.headers.get("Cookie"));
  const cookie = makeRecentGroupsCookie(recent, {
    memberName: member.name,
    name: group.name,
    role: "member",
    url: `/g/${group.slug}/m/${member.token}`,
  });

  return data(
    { balances: myBalances, expenses, group, member, members },
    { headers: { "Set-Cookie": cookie } }
  );
}

export default function MemberView({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { group, member, members, expenses, balances } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const expenseDescriptionRef = useRef<HTMLInputElement>(null);
  const { setCommands, setShortcutGroups } = useKeyboard();

  // H - Navigate home
  useHotkey("H", () => {
    window.location.href = "/";
  });

  // E - Focus expense description
  useHotkey("E", () => {
    if (members.length >= 2) {
      expenseDescriptionRef.current?.focus();
    }
  });

  // Set up commands for command palette
  useEffect(() => {
    const commands: Command[] = [
      {
        action: () => {
          window.location.href = "/";
        },
        id: "home",
        label: "Go home",
        shortcut: "H",
      },
    ];

    if (members.length >= 2) {
      commands.push({
        action: () => expenseDescriptionRef.current?.focus(),
        id: "focus-expense",
        label: "Focus expense input",
        shortcut: "E",
      });
    }

    setCommands(commands);
  }, [members, setCommands]);

  // Set up help overlay shortcuts
  useEffect(() => {
    const shortcuts: ShortcutGroup[] = [
      {
        shortcuts: [
          { description: "Go home", key: "H" },
          { description: "Open command palette", key: "Mod+K" },
          { description: "Open command palette", key: "/" },
          { description: "Show keyboard shortcuts", key: "?" },
        ],
        title: "Navigation",
      },
    ];

    if (members.length >= 2) {
      shortcuts.push({
        shortcuts: [{ description: "Focus expense input", key: "E" }],
        title: "Actions",
      });
    }

    setShortcutGroups(shortcuts);
  }, [members, setShortcutGroups]);

  // Show success toast when expense is added
  useEffect(() => {
    if (actionData?.success) {
      const { formData } = navigation;
      if (formData?.get("intent") === "add-expense") {
        sileo.success({
          description: "Expense added successfully",
          duration: 2000,
          title: "Expense added",
        });
      }
    }
  }, [actionData, navigation.formData]);

  return (
    <main className="container" style={{ marginTop: "2rem", maxWidth: 680 }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <a
          href="/"
          style={{ fontSize: "0.85rem", opacity: 0.5, textDecoration: "none" }}
        >
          ← SplitSend
        </a>
        <h1 style={{ margin: "0.25rem 0 0" }}>{group.name}</h1>
        <p style={{ margin: "0.25rem 0 0", opacity: 0.6 }}>
          Logged in as <strong>{member.name}</strong>
        </p>
      </div>

      {/* My Balances */}
      <section className="card" aria-labelledby="balances-heading" style={{ marginBottom: "1.5rem" }}>
        <h2
          id="balances-heading"
          style={{
            alignItems: "center",
            display: "flex",
            gap: "0.5rem",
            marginTop: 0,
          }}
        >
          <ArrowRightLeft size={20} /> Your Balances
        </h2>
        {balances.length === 0 ? (
          <p style={{ opacity: 0.6 }}>You're all settled up! 🎉</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {balances.map((b, i) => {
              const iOwe = b.from_member_id === member.id;
              return (
                <li
                  key={i}
                  style={{
                    borderBottom:
                      i < balances.length - 1
                        ? "1px solid var(--color-border, #eee)"
                        : "none",
                    padding: "0.5rem 0",
                  }}
                >
                  {iOwe ? (
                    <span>
                      You owe <strong>{b.to_name}</strong>{" "}
                      <span
                        style={{
                          color: "var(--color-error, #d32f2f)",
                          fontWeight: 700,
                        }}
                      >
                        {cents(b.amount)}
                      </span>
                    </span>
                  ) : (
                    <span>
                      <strong>{b.from_name}</strong> owes you{" "}
                      <span
                        style={{
                          color: "var(--color-success, #2e7d32)",
                          fontWeight: 700,
                        }}
                      >
                        {cents(b.amount)}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Members */}
      <section className="card" aria-labelledby="members-heading" style={{ marginBottom: "1.5rem" }}>
        <h2
          id="members-heading"
          style={{
            alignItems: "center",
            display: "flex",
            gap: "0.5rem",
            marginTop: 0,
          }}
        >
          <Users size={20} /> Members{" "}
          <span style={{ opacity: 0.5 }}>({members.length})</span>
        </h2>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {members.map((m) => (
            <li
              key={m.id}
              style={{
                fontWeight: m.id === member.id ? 700 : 400,
                padding: "0.35rem 0",
              }}
            >
              {m.name}
              {m.id === member.id && (
                <span style={{ marginLeft: "0.5rem", opacity: 0.5 }}>
                  (you)
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Add Expense */}
      {members.length >= 2 && (
        <section className="card" aria-labelledby="add-expense-heading" style={{ marginBottom: "1.5rem" }}>
          <h2 id="add-expense-heading" style={{ marginTop: 0 }}>Add Expense</h2>

          {actionData?.error && (
            <p style={{ color: "var(--danger)" }}>{actionData.error}</p>
          )}

          <Form method="post" key={expenses.length} className="form-stack">
            <input type="hidden" name="intent" value="add-expense" />

            <div>
              <label htmlFor="description" className="flex items-center gap-2">
                What was it for?
              </label>
              <input
                ref={expenseDescriptionRef}
                id="description"
                name="description"
                type="text"
                placeholder="e.g. Dinner, Groceries, Uber"
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="amount">Amount ($)</label>
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label htmlFor="paidBy">Who paid?</label>
              <select
                id="paidBy"
                name="paidBy"
                defaultValue={member.id}
                required
              >
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.id === member.id ? " (you)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="checkbox-group">
              <legend>Split among</legend>
              {members.map((m) => (
                <label key={m.id} className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    name="splitAmong"
                    value={m.id}
                    defaultChecked
                  />
                  {m.name}
                  {m.id === member.id ? " (you)" : ""}
                </label>
              ))}
            </fieldset>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2"
              style={{ width: "100%" }}
            >
              {isSubmitting ? "Adding…" : "Add Expense"}
            </button>
          </Form>
        </section>
      )}

      {/* Expenses */}
      {expenses.length > 0 && (
        <section className="card" aria-labelledby="expenses-heading">
          <h2
            id="expenses-heading"
            style={{
              alignItems: "center",
              display: "flex",
              gap: "0.5rem",
              marginTop: 0,
            }}
          >
            <Receipt size={20} /> Expenses
          </h2>
          {expenses.map((e) => (
            <div
              key={e.id}
              style={{
                borderBottom: "1px solid var(--color-border, #eee)",
                padding: "0.75rem 0",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <h3 style={{ fontSize: "inherit", lineHeight: "inherit", margin: 0 }}>{e.description}</h3>
                <span style={{ fontWeight: 700 }}>{cents(e.amount)}</span>
              </div>
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.35rem",
                  marginTop: "0.4rem",
                }}
              >
                <span className="badge success">{e.paid_by_name} paid</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.4 }}>→</span>
                {e.splits.map((s) => (
                  <span key={s.member_id} className="badge outline">
                    {s.member_name} {cents(s.amount)}
                  </span>
                ))}
              </div>
              <small
                style={{ display: "block", marginTop: "0.25rem", opacity: 0.5 }}
              >
                Added by {e.added_by_name ?? "admin"}
              </small>
            </div>
          ))}
        </section>
      )}

      {expenses.length === 0 && members.length < 2 && (
        <p style={{ opacity: 0.5, textAlign: "center" }}>
          No expenses yet. Waiting for more members to be added.
        </p>
      )}
    </main>
  );
}
