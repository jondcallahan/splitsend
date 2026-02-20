import { useHotkey } from "@tanstack/react-hotkeys";
import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import currency from "currency.js";
import {
  Share2,
  ArrowRightLeft,
  Receipt,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Form, redirect, useNavigation, data } from "react-router";
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

import type { Route } from "./+types/admin";

export function meta({ data }: Route.MetaArgs) {
  return [{ title: `${data?.group?.name ?? "Group"} — SplitSend Admin` }];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const group = await GroupDAO.findBySlugAndAdminToken(
    params.slug,
    params.adminToken
  );
  if (!group) {
    throw new Response("Not Found", { status: 404 });
  }

  const members = await MemberDAO.findByGroupId(group.id);
  const expenses = await ExpenseDAO.findByGroupId(group.id);
  const balances = await ExpenseDAO.getBalances(group.id);

  const recent = parseRecentGroups(request.headers.get("Cookie"));
  const cookie = makeRecentGroupsCookie(recent, {
    name: group.name,
    role: "admin",
    url: `/g/${group.slug}/admin/${group.admin_token}`,
  });

  return data(
    { balances, expenses, group, members },
    { headers: { "Set-Cookie": cookie } }
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const group = await GroupDAO.findBySlugAndAdminToken(
    params.slug,
    params.adminToken
  );
  if (!group) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "add-member") {
    const name = String(formData.get("memberName")).trim();
    if (!name) {
      return { error: "Member name is required" };
    }
    await MemberDAO.create(group.id, name);
    return { success: true };
  }

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

    await ExpenseDAO.create(group.id, paidBy, description, amountCents, splitAmong);
    return { success: true };
  }

  if (intent === "update-name") {
    const name = String(formData.get("groupName")).trim();
    if (!name) {
      return { error: "Group name is required" };
    }
    await GroupDAO.updateName(group.id, name);
    return { success: true };
  }

  if (intent === "update-expense") {
    const expenseId = Number(formData.get("expenseId"));
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

    await ExpenseDAO.update(expenseId, description, amountCents, paidBy, splitAmong);
    return { success: true };
  }

  if (intent === "delete-expense") {
    const expenseId = Number(formData.get("expenseId"));
    await ExpenseDAO.delete(expenseId);
    return { success: true };
  }

  return { error: "Unknown action" };
}

export default function Admin({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { group, members, expenses, balances } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Refs for keyboard navigation
  const memberInputRef = useRef<HTMLInputElement>(null);
  const expenseDescriptionRef = useRef<HTMLInputElement>(null);

  const { setCommands, setShortcutGroups } = useKeyboard();

  function copyLink(link: string, name: string) {
    navigator.clipboard.writeText(link);
    sileo.success({
      description: `Share this with ${name}`,
      duration: 2000,
      title: "Link copied",
    });
  }

  async function shareOrCopyLink(link: string, name: string) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name}'s invite — ${group.name}`,
          text: `Here's your SplitSend link for ${group.name}. No app needed, just open the link.`,
          url: link,
        });
      } catch (err) {
        // AbortError means the user dismissed the sheet — that's fine
        if (err instanceof Error && err.name !== "AbortError") {
          copyLink(link, name);
        }
      }
    } else {
      copyLink(link, name);
    }
  }

  // M - Focus member input
  useHotkey("M", () => {
    memberInputRef.current?.focus();
  });

  // E - Focus expense description
  useHotkey("E", () => {
    if (members.length >= 2) {
      expenseDescriptionRef.current?.focus();
    }
  });

  // R - Toggle rename dialog using OAT's dialog API
  useHotkey("R", () => {
    const dialog = document.querySelector(
      "#rename-dialog"
    ) as HTMLDialogElement;
    if (dialog) {
      dialog.open ? dialog.close() : dialog.showModal();
    }
  });

  // H - Navigate home
  useHotkey("H", () => {
    window.location.href = "/";
  });

  // C then 1-9 - Copy invite link for member N
  const [copyMode, setCopyMode] = useState(false);
  const copyToastRef = useRef<string | null>(null);

  function exitCopyMode() {
    setCopyMode(false);
    if (copyToastRef.current) {
      sileo.dismiss(copyToastRef.current);
      copyToastRef.current = null;
    }
  }

  useHotkey("C", () => {
    if (members.length > 0) {
      copyToastRef.current = sileo.info({
        description: "Press 1-9 to select member, Escape to cancel",
        duration: 3000,
        title: "Copy invite link",
      });
      setCopyMode(true);
      setTimeout(() => setCopyMode(false), 3000);
    }
  });

  (
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as RegisterableHotkey[]
  ).forEach((num, i) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkey(
      num,
      () => {
        const member = members[i];
        if (!member) {
          return;
        }
        const link = `${baseUrl}/g/${group.slug}/m/${member.token}`;
        copyLink(link, member.name);
        exitCopyMode();
      },
      { enabled: copyMode }
    );
  });

  useHotkey(
    "Escape",
    () => {
      exitCopyMode();
    },
    { enabled: copyMode }
  );

  // Set up commands for command palette
  useEffect(() => {
    const commands: Command[] = [
      {
        action: () => memberInputRef.current?.focus(),
        id: "focus-member",
        label: "Focus member input",
        shortcut: "M",
      },
      {
        action: () => {
          const dialog = document.querySelector(
            "#rename-dialog"
          ) as HTMLDialogElement;
          dialog?.showModal();
        },
        id: "toggle-rename",
        label: "Rename group",
        shortcut: "R",
      },
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

    // Add member invite copy commands
    members.forEach((member, index) => {
      if (index < 9) {
        commands.push({
          action: () => {
            const link = `${baseUrl}/g/${group.slug}/m/${member.token}`;
            copyLink(link, member.name);
          },
          group: "Members",
          id: `copy-invite-${member.id}`,
          label: `Copy invite link for ${member.name}`,
          shortcut: `C ${index + 1}`,
        });
      }
    });

    setCommands(commands);
  }, [members, group.slug, baseUrl, setCommands]);

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
      {
        shortcuts: [
          { description: "Focus member input", key: "M" },
          { description: "Toggle rename group", key: "R" },
          { description: "Close dialog/cancel sequence", key: "Escape" },
        ],
        title: "Actions",
      },
    ];

    if (members.length >= 2) {
      shortcuts[1].shortcuts.splice(1, 0, {
        description: "Focus expense input",
        key: "E",
      });
    }

    if (members.length > 0) {
      shortcuts.push({
        shortcuts: members.slice(0, 9).map((member, index) => ({
          description: `Copy invite link for ${member.name}`,
          key: `C ${index + 1}`,
        })),
        title: "Member Invites",
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
    <main className="container narrow mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href="/" className="text-light" style={{ textDecoration: "none" }}>
            <small>← SplitSend</small>
          </a>
          <div className="flex items-center gap-2 mt-2">
            <h1 style={{ margin: 0 }}>{group.name}</h1>
            <button
              type="button"
              commandfor="rename-dialog"
              command="show-modal"
              aria-label="Rename group"
              title="Rename group (R)"
              className="outline small"
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>
        <small className="text-light">Admin</small>
      </div>

      {/* Rename Drawer */}
      <dialog key={group.name} id="rename-dialog" className="drawer" aria-labelledby="rename-dialog-heading" closedby="any">
        <div className="drawer-handle" />
        <Form method="post">
          <header>
            <h3 id="rename-dialog-heading" tabIndex={-1} autoFocus>Rename Group</h3>
          </header>
          <div>
            <input type="hidden" name="intent" value="update-name" />
            <label htmlFor="rename-input">Group name</label>
            <input
              id="rename-input"
              name="groupName"
              type="text"
              defaultValue={group.name}
              required
            />
          </div>
          <footer className="flex gap-2">
            <button
              type="button"
              commandfor="rename-dialog"
              command="close"
              className="outline"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </footer>
        </Form>
      </dialog>

      {actionData?.error && (
        <p className="card p-4 mb-4" style={{ color: "var(--danger)" }}>
          {actionData.error}
        </p>
      )}

      {/* Members Section */}
      <section className="card mb-6" aria-labelledby="members-heading">
        <h2 id="members-heading">
          Members{" "}
          {members.length > 0 && (
            <span className="text-light">({members.length})</span>
          )}
        </h2>

        {members.length === 0 ? (
          <p className="text-light">
            No members yet. Add someone to get started!
          </p>
        ) : (
          <table className="w-100 mb-4" aria-label="Members">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Invite Link</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, index) => {
                const link = `${baseUrl}/g/${group.slug}/m/${m.token}`;
                return (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => shareOrCopyLink(link, m.name)}
                        className="small flex items-center gap-1"
                      >
                        <Share2 size={14} /> Share link
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <Form method="post" key={members.length} className="flex gap-2">
          <input type="hidden" name="intent" value="add-member" />
          <input
            ref={memberInputRef}
            aria-label="Member name"
            name="memberName"
            type="text"
            placeholder="Name"
            required
            autoComplete="off"
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1"
          >
            Add
          </button>
        </Form>
      </section>

      {/* Add Expense */}
      {members.length >= 2 && (
        <section className="card mb-6" aria-labelledby="add-expense-heading">
          <h2 id="add-expense-heading">Add Expense</h2>
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
              <select id="paidBy" name="paidBy" required>
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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
                </label>
              ))}
            </fieldset>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Adding…" : "Add Expense"}
            </button>
          </Form>
        </section>
      )}

      {/* Balances */}
      {balances.length > 0 && (
        <section className="card mb-6" aria-labelledby="settlements-heading">
          <h2 id="settlements-heading" className="flex items-center gap-2">
            <ArrowRightLeft size={20} /> Settlements
          </h2>
          <ul className="unstyled" style={{ margin: 0 }}>
            {balances.map((b, i) => (
              <li
                key={i}
                style={{
                  borderBottom:
                    i < balances.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  padding: "var(--space-2) 0",
                }}
              >
                <strong>{b.from_name}</strong> owes <strong>{b.to_name}</strong>{" "}
                <strong>{cents(b.amount)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Expenses */}
      {expenses.length > 0 && (
        <section className="card" aria-labelledby="expenses-heading">
          <h2 id="expenses-heading" className="flex items-center gap-2">
            <Receipt size={20} /> Expenses
          </h2>
          {expenses.map((e, idx) => {
            const dialogId = `edit-expense-${e.id}`;
            return (
              <div
                key={`${e.id}-${e.description}-${e.amount}-${e.paid_by_member_id}`}
                className={idx === 0 ? "expense-item" : ""}
                style={{
                  borderBottom: "1px solid var(--border)",
                  padding: "var(--space-4) 0",
                }}
              >
                <div className="flex justify-between items-center">
                  <h3 style={{ fontSize: "inherit", lineHeight: "inherit", margin: 0 }}>{e.description}</h3>
                  <div className="flex items-center gap-2">
                    <strong>{cents(e.amount)}</strong>
                    <button
                      type="button"
                      aria-label={`Edit expense: ${e.description}`}
                      commandfor={dialogId}
                      command="show-modal"
                      className="outline small"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 mt-2"
                  style={{ flexWrap: "wrap" }}
                >
                  <span className="badge success">{e.paid_by_name} paid</span>
                  <small className="text-lighter">→</small>
                  {e.splits.map((s) => (
                    <span key={s.member_id} className="badge outline">
                      {s.member_name} {cents(s.amount)}
                    </span>
                  ))}
                </div>
                <small
                  className="text-lighter mt-2"
                  style={{ display: "block" }}
                >
                  Added by {e.added_by_name ?? "admin"}
                </small>

                {/* Delete Confirmation Dialog */}
                <dialog id={`delete-dialog-${e.id}`} aria-labelledby={`delete-dialog-${e.id}-heading`} closedby="any">
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-expense" />
                    <input type="hidden" name="expenseId" value={e.id} />
                    <header>
                      <h3 id={`delete-dialog-${e.id}-heading`}>Delete Expense?</h3>
                      <p>
                        Are you sure you want to delete "{e.description}"? This
                        action cannot be undone.
                      </p>
                    </header>
                    <footer className="flex gap-2 justify-between">
                      <button
                        type="button"
                        commandfor={`delete-dialog-${e.id}`}
                        command="close"
                        className="outline"
                      >
                        Cancel
                      </button>
                      <button type="submit" data-variant="danger">
                        Delete
                      </button>
                    </footer>
                  </Form>
                </dialog>

                {/* Edit Drawer */}
                <dialog id={dialogId} className="drawer" aria-labelledby={`${dialogId}-heading`} closedby="any">
                  <div className="drawer-handle" />
                  <Form method="post" id={`edit-form-${e.id}`}>
                    <header>
                      <h3 id={`${dialogId}-heading`} tabIndex={-1} autoFocus>Edit Expense</h3>
                    </header>
                    <div className="form-stack">
                      <input
                        type="hidden"
                        name="intent"
                        value="update-expense"
                      />
                      <input type="hidden" name="expenseId" value={e.id} />

                      <div>
                        <label htmlFor={`desc-${e.id}`}>Description</label>
                        <input
                          id={`desc-${e.id}`}
                          name="description"
                          type="text"
                          defaultValue={e.description}
                          required
                          autoComplete="off"
                        />
                      </div>

                      <div>
                        <label htmlFor={`amt-${e.id}`}>Amount ($)</label>
                        <input
                          id={`amt-${e.id}`}
                          name="amount"
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*\.?[0-9]*"
                          defaultValue={
                            currency(e.amount, { fromCents: true }).value
                          }
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor={`paid-${e.id}`}>Who paid?</label>
                        <select
                          id={`paid-${e.id}`}
                          name="paidBy"
                          defaultValue={e.paid_by_member_id}
                          required
                        >
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <fieldset className="checkbox-group">
                        <legend>Split among</legend>
                        {members.map((m) => (
                          <label
                            key={m.id}
                            className="flex items-center gap-2 mb-2"
                          >
                            <input
                              type="checkbox"
                              name="splitAmong"
                              value={m.id}
                              defaultChecked={e.splits.some(
                                (s) => s.member_id === m.id
                              )}
                            />
                            {m.name}
                          </label>
                        ))}
                      </fieldset>
                    </div>
                    <footer className="flex items-center justify-between">
                      <button
                        type="button"
                        commandfor={`delete-dialog-${e.id}`}
                        command="show-modal"
                        data-variant="danger"
                        className="ghost small"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          commandfor={dialogId}
                          command="close"
                          className="outline"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex items-center gap-2"
                        >
                          {isSubmitting ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </footer>
                  </Form>
                </dialog>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
