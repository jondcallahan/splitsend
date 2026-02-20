import { useHotkey } from "@tanstack/react-hotkeys";
import currency from "currency.js";
import { ArrowRightLeft, Users, Receipt } from "lucide-react";
import { useEffect, useRef } from "react";
import { data, Form, useNavigation } from "react-router";
import { sileo } from "sileo";

import type { Command } from "~/components/command-palette";
import type { ShortcutGroup } from "~/components/help-overlay";
import {
  Badge,
  Button,
  CardSection,
  Checkbox,
  Field,
  SelectField,
  SelectItem,
} from "~/components/ui";
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
  const title = `${data?.member?.name ?? "Member"} — ${data?.group?.name ?? "Group"} — SplitSend`;
  const ogImage = data?.ogImage;

  return [
    { title },
    { content: title, property: "og:title" },
    { content: ogImage, property: "og:image" },
    { content: "1200", property: "og:image:width" },
    { content: "630", property: "og:image:height" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: title, name: "twitter:title" },
    { content: ogImage, name: "twitter:image" },
  ];
}

export async function action({ request, params }: Route.ActionArgs) {
  const group = await GroupDAO.findBySlug(params.slug);
  if (!group) {
    throw new Response("Not Found", { status: 404 });
  }

  const member = await MemberDAO.findByGroupIdAndToken(
    group.id,
    params.memberToken
  );
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

    await ExpenseDAO.create(
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
  const group = await GroupDAO.findBySlug(params.slug);
  if (!group) {
    throw new Response("Not Found", { status: 404 });
  }

  const member = await MemberDAO.findByGroupIdAndToken(
    group.id,
    params.memberToken
  );
  if (!member) {
    throw new Response("Not Found", { status: 404 });
  }

  const members = await MemberDAO.findByGroupId(group.id);
  const expenses = await ExpenseDAO.findByGroupId(group.id);
  const balances = await ExpenseDAO.getBalances(group.id);

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

  const url = new URL(request.url);
  const ogImage = `${url.origin}/g/${group.slug}/m/${member.token}/og.png`;

  return data(
    { balances: myBalances, expenses, group, member, members, ogImage },
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
          duration: 2000,
          title: "Expense added",
        });
      }
    }
  }, [actionData, navigation.formData]);

  return (
    <main className="container mt-8">
      {/* Header */}
      <div className="mb-6">
        <a href="/" className="text-sm opacity-50 no-underline text-light">
          ← SplitSend
        </a>
        <h1 className="mt-1">{group.name}</h1>
        <p className="mt-1 opacity-60">
          Logged in as <strong>{member.name}</strong>
        </p>
      </div>

      {/* My Balances */}
      <CardSection className="mb-6" aria-labelledby="balances-heading">
        <h2 id="balances-heading" className="flex items-center gap-2">
          <ArrowRightLeft size={20} /> Your Balances
        </h2>
        {balances.length === 0 ? (
          <p className="opacity-60">You're all settled up! 🎉</p>
        ) : (
          <ul className="list-none m-0 p-0">
            {balances.map((b, i) => {
              const iOwe = b.from_member_id === member.id;
              return (
                <li
                  key={i}
                  className={`py-2 ${i < balances.length - 1 ? "border-b border-mauve-200 dark:border-neutral-800" : ""}`}
                >
                  {iOwe ? (
                    <span>
                      You owe <strong>{b.to_name}</strong>{" "}
                      <span className="text-red-600 dark:text-red-400 font-bold">
                        {cents(b.amount)}
                      </span>
                    </span>
                  ) : (
                    <span>
                      <strong>{b.from_name}</strong> owes you{" "}
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {cents(b.amount)}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardSection>

      {/* Members */}
      <CardSection className="mb-6" aria-labelledby="members-heading">
        <h2 id="members-heading" className="flex items-center gap-2">
          <Users size={20} /> Members{" "}
          <span className="opacity-50">({members.length})</span>
        </h2>
        <ul className="list-none m-0 p-0">
          {members.map((m) => (
            <li
              key={m.id}
              className={`py-1.5 ${m.id === member.id ? "font-bold" : ""}`}
            >
              {m.name}
              {m.id === member.id && (
                <span className="ml-2 opacity-50">(you)</span>
              )}
            </li>
          ))}
        </ul>
      </CardSection>

      {/* Add Expense */}
      {members.length >= 2 && (
        <CardSection className="mb-6" aria-labelledby="add-expense-heading">
          <h2 id="add-expense-heading">Add Expense</h2>

          {actionData?.error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {actionData.error}
            </p>
          )}

          <Form method="post" key={expenses.length} className="form-stack">
            <input type="hidden" name="intent" value="add-expense" />

            <Field label="What was it for?">
              <input
                ref={expenseDescriptionRef}
                name="description"
                type="text"
                placeholder="e.g. Dinner, Groceries, Uber"
                required
                autoComplete="off"
              />
            </Field>

            <Field label="Amount ($)">
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                required
              />
            </Field>

            <SelectField
              label="Who paid?"
              name="paidBy"
              defaultValue={member.id}
              required
              placeholder="Select…"
              options={members.map((m) => ({
                label: `${m.name}${m.id === member.id ? " (you)" : ""}`,
                value: m.id,
              }))}
            >
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                  {m.id === member.id ? " (you)" : ""}
                </SelectItem>
              ))}
            </SelectField>

            <fieldset className="checkbox-group">
              <legend>Split among</legend>
              {members.map((m) => (
                <Checkbox
                  key={m.id}
                  name="splitAmong"
                  value={m.id}
                  label={`${m.name}${m.id === member.id ? " (you)" : ""}`}
                  defaultChecked
                />
              ))}
            </fieldset>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Adding…" : "Add Expense"}
            </Button>
          </Form>
        </CardSection>
      )}

      {/* Expenses */}
      {expenses.length > 0 && (
        <CardSection aria-labelledby="expenses-heading">
          <h2 id="expenses-heading" className="flex items-center gap-2">
            <Receipt size={20} /> Expenses
          </h2>
          {expenses.map((e) => (
            <div
              key={e.id}
              className="border-b border-mauve-200 dark:border-neutral-800 py-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base leading-relaxed m-0">
                  {e.description}
                </h3>
                <span className="font-bold">{cents(e.amount)}</span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                <Badge $variant="success">{e.paid_by_name} paid</Badge>
                <span className="text-xs opacity-40">→</span>
                {e.splits.map((s) => (
                  <Badge key={s.member_id} $variant="outline">
                    {s.member_name} {cents(s.amount)}
                  </Badge>
                ))}
              </div>
              <small className="block mt-1 opacity-50">
                Added by {e.added_by_name ?? "admin"}
              </small>
            </div>
          ))}
        </CardSection>
      )}

      {expenses.length === 0 && members.length < 2 && (
        <p className="opacity-50 text-center">
          No expenses yet. Waiting for more members to be added.
        </p>
      )}
    </main>
  );
}
