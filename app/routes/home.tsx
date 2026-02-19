import { useHotkey } from "@tanstack/react-hotkeys";
import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import {
  Wallet,
  Shield,
  User,
  LinkIcon,
  UserPlus,
  ReceiptText,
  Zap,
  X,
  ArrowRightLeft,
  Check,
  Minus,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Form, redirect, useNavigation, data } from "react-router";

import type { Command } from "~/components/command-palette";
import type { ShortcutGroup } from "~/components/help-overlay";

import { useKeyboard } from "~/contexts/keyboard-context";
import { GroupDAO } from "~/dao/group.dao.server";
import { parseRecentGroups, removeRecentGroup } from "~/lib/recent-groups.server";

import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SplitSend — The fastest way to split expenses" },
    {
      content:
        "Split expenses with a link. No accounts, no app downloads, no nonsense. Create a group, share a link, settle up.",
      name: "description",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const recentGroups = parseRecentGroups(request.headers.get("Cookie"));
  return { recentGroups };
}

function escapeUrlForId(url: string): string {
  return url.replace(/[^a-zA-Z0-9]/g, "-");
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "remove-recent") {
    const urlToRemove = String(formData.get("url"));
    const recentGroups = parseRecentGroups(request.headers.get("Cookie"));
    const cookie = removeRecentGroup(recentGroups, urlToRemove);
    
    return data(
      { success: true },
      { headers: { "Set-Cookie": cookie } }
    );
  }

  const name = String(formData.get("name")).trim();

  if (!name) {
    return { error: "Please enter a group name" };
  }

  const group = await GroupDAO.create(name);
  return redirect(`/g/${group.slug}/admin/${group.admin_token}`);
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { recentGroups } = loaderData;
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCommands, setShortcutGroups } = useKeyboard();

  // Focus name input on N key
  useHotkey("N", () => {
    inputRef.current?.focus();
  });

  // Navigate to recent groups with number keys
  (
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as RegisterableHotkey[]
  ).forEach((key, i) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useHotkey(key, () => {
      const group = recentGroups[i];
      if (group) {
        window.location.href = group.url;
      }
    });
  });

  // Set up commands for command palette
  useEffect(() => {
    const commands: Command[] = [
      {
        action: () => inputRef.current?.focus(),
        id: "focus-name",
        label: "Focus name input",
        shortcut: "N",
      },
      ...recentGroups.map((group, index) => ({
        action: () => {
          window.location.href = group.url;
        },
        group: "Recent Groups",
        id: `goto-recent-${index}`,
        label: `Go to ${group.name}`,
        shortcut: index < 9 ? String(index + 1) : undefined,
      })),
    ];

    setCommands(commands);

    // Set up help overlay shortcuts
    const shortcuts: ShortcutGroup[] = [
      {
        shortcuts: [
          { description: "Open command palette", key: "Mod+K" },
          { description: "Open command palette", key: "/" },
          { description: "Show keyboard shortcuts", key: "?" },
        ],
        title: "Navigation",
      },
      {
        shortcuts: [
          { description: "Focus name input", key: "N" },
          { description: "Create group", key: "Enter" },
        ],
        title: "Actions",
      },
    ];

    if (recentGroups.length > 0) {
      shortcuts.push({
        shortcuts: recentGroups.slice(0, 9).map((group, index) => ({
          description: `Go to ${group.name}`,
          key: String(index + 1),
        })),
        title: "Recent Groups",
      });
    }

    setShortcutGroups(shortcuts);
  }, [recentGroups, setCommands, setShortcutGroups]);

  return (
    <main className="container" style={{ marginTop: "10vh", maxWidth: 640 }}>
      {/* Hero */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <h1
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: "2.75rem",
            gap: "0.5rem",
            justifyContent: "center",
            letterSpacing: "-0.02em",
            marginBottom: "0.5rem",
          }}
        >
          <Wallet size={36} /> SplitSend
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            lineHeight: 1.5,
            margin: "0 auto",
            maxWidth: 440,
            opacity: 0.7,
          }}
        >
          The fastest way to split expenses.
          <br />
          <span style={{ fontSize: "1rem" }}>
            No accounts. No app downloads. Just a&nbsp;link.
          </span>
        </p>
      </div>

      {/* Create Group — the main action */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <Form method="post">
          <fieldset disabled={isSubmitting}>
            <label htmlFor="name">
              Name your group
            </label>
            <input
              ref={inputRef}
              id="name"
              name="name"
              type="text"
              placeholder='e.g. "Ski Trip 2026" or "Roommates"'
              required
              autoComplete="off"
            />

            {actionData?.error && (
              <p style={{ color: "var(--color-error, red)" }}>
                {actionData.error}
              </p>
            )}

            <button
              type="submit"
              className="flex items-center justify-center gap-2"
              style={{ marginTop: "1rem", width: "100%" }}
            >
              {isSubmitting ? "Creating…" : "Create Group — It's Free"}
            </button>
          </fieldset>
        </Form>
      </div>

      {/* Recent Groups */}
      {recentGroups.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <h3
            style={{
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              opacity: 0.6,
              textTransform: "uppercase",
            }}
          >
            Your recent groups
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {recentGroups.map((g, index) => {
              const dialogId = `dismiss-dialog-${escapeUrlForId(g.url)}`;
              return (
                <div
                  key={g.url}
                  style={{
                    position: "relative",
                  }}
                >
                  <a
                    href={g.url}
                    className="card"
                    style={{
                      alignItems: "center",
                      color: "inherit",
                      display: "flex",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      textDecoration: "none",
                    }}
                  >
                    {g.role === "admin" ? <Shield size={18} /> : <User size={18} />}
                    <div style={{ flex: 1 }}>
                      <strong>{g.name}</strong>
                      <div style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                        {g.role === "admin" ? "Admin" : `Member · ${g.memberName}`}
                      </div>
                    </div>
                  </a>
                  <button
                    type="button"
                    className="ghost small"
                    onClick={(e) => {
                      e.preventDefault();
                      const dialog = document.querySelector(
                        `#${dialogId}`
                      ) as HTMLDialogElement;
                      dialog?.showModal();
                    }}
                    style={{
                      position: "absolute",
                      right: "0.5rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      opacity: 0.5,
                    }}
                    aria-label={`Dismiss ${g.name}`}
                  >
                    <X size={16} />
                  </button>
                  <dialog
                    id={dialogId}
                    aria-labelledby={`${dialogId}-heading`}
                    closedby="any"
                  >
                    <div style={{ padding: "1.5rem" }}>
                      <div style={{ marginBottom: "1.5rem" }}>
                        <h3 id={`${dialogId}-heading`} style={{ marginBottom: "0.5rem" }}>
                          Remove from recent groups?
                        </h3>
                        <p style={{ opacity: 0.7, margin: 0 }}>
                          This will remove "{g.name}" from your recent groups list. You can still access it via the original link.
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="outline"
                          commandfor={dialogId}
                          command="close"
                        >
                          Cancel
                        </button>
                        <Form method="post" style={{ display: "inline" }}>
                          <input type="hidden" name="intent" value="remove-recent" />
                          <input type="hidden" name="url" value={g.url} />
                          <button type="submit" data-variant="danger">
                            Remove
                          </button>
                        </Form>
                      </div>
                    </div>
                  </dialog>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* How it works */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2
          style={{
            fontSize: "1.1rem",
            letterSpacing: "0.05em",
            marginBottom: "1.5rem",
            opacity: 0.5,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          How it works
        </h2>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          }}
        >
          <div
            className="card"
            style={{ padding: "1.25rem", textAlign: "center" }}
          >
            <Zap size={24} style={{ marginBottom: "0.5rem", opacity: 0.6 }} />
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>
              1. Create a group
            </strong>
            <small style={{ opacity: 0.6 }}>
              Pick a name. That's the whole setup.
            </small>
          </div>
          <div
            className="card"
            style={{ padding: "1.25rem", textAlign: "center" }}
          >
            <LinkIcon
              size={24}
              style={{ marginBottom: "0.5rem", opacity: 0.6 }}
            />
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>
              2. Share the link
            </strong>
            <small style={{ opacity: 0.6 }}>
              Each member gets a private link. Nothing to install.
            </small>
          </div>
          <div
            className="card"
            style={{ padding: "1.25rem", textAlign: "center" }}
          >
            <ReceiptText
              size={24}
              style={{ marginBottom: "0.5rem", opacity: 0.6 }}
            />
            <strong style={{ display: "block", marginBottom: "0.25rem" }}>
              3. Add expenses
            </strong>
            <small style={{ opacity: 0.6 }}>
              Anyone can add. We handle the math.
            </small>
          </div>
        </div>
      </section>

      {/* Smart Settlements */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          marginBottom: "2.5rem",
          paddingTop: "2rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <ArrowRightLeft size={28} style={{ opacity: 0.5, marginBottom: "0.5rem" }} />
          <h2
            style={{
              fontSize: "1.5rem",
              letterSpacing: "-0.01em",
              marginBottom: "0.5rem",
            }}
          >
            Fewer payments. Less hassle.
          </h2>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.6,
              margin: "0 auto",
              maxWidth: 460,
              opacity: 0.6,
            }}
          >
            When everyone owes everyone, things get messy fast. SplitSend
            automatically simplifies the debts so your group settles up with the
            fewest payments possible.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "1fr 1fr",
            margin: "0 auto",
            maxWidth: 460,
          }}
        >
          <div
            className="card"
            style={{ padding: "1rem", textAlign: "center" }}
          >
            <div style={{ fontSize: "0.75rem", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Without simplification
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700, opacity: 0.4 }}>
              6
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.4 }}>
              payments between 4 people
            </div>
          </div>
          <div
            className="card"
            style={{ padding: "1rem", textAlign: "center" }}
          >
            <div style={{ fontSize: "0.75rem", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              With SplitSend
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>
              3
            </div>
            <div style={{ fontSize: "0.85rem", opacity: 0.6 }}>
              payments or fewer
            </div>
          </div>
        </div>
        <p
          style={{
            fontSize: "0.85rem",
            margin: "1rem auto 0",
            maxWidth: 460,
            opacity: 0.4,
            textAlign: "center",
          }}
        >
          Instead of everyone paying everyone back individually, we figure out
          the shortest path to settle all debts at once.
        </p>
      </section>

      {/* SplitSend vs Splitwise */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          marginBottom: "3rem",
          paddingTop: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            letterSpacing: "-0.01em",
            marginBottom: "1.5rem",
            textAlign: "center",
          }}
        >
          SplitSend vs Splitwise
        </h2>
        <div
          style={{
            margin: "0 auto",
            maxWidth: 520,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid var(--border)", opacity: 0.5 }}></th>
                <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", borderBottom: "2px solid var(--border)", fontWeight: 700 }}>SplitSend</th>
                <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", borderBottom: "2px solid var(--border)", opacity: 0.5 }}>Splitwise</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: "Account required", splitsend: false, splitwise: true },
                { feature: "App download needed", splitsend: false, splitwise: true },
                { feature: "Free", splitsend: true, splitwise: "Freemium" },
                { feature: "Smart debt simplification", splitsend: true, splitwise: "Pro only" },
                { feature: "Works via shared link", splitsend: true, splitwise: false },
                { feature: "Everyone must sign up", splitsend: false, splitwise: true },
                { feature: "Ads", splitsend: false, splitwise: true },
              ].map((row) => (
                <tr key={row.feature}>
                  <td style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
                    {row.feature}
                  </td>
                  <td style={{ textAlign: "center", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
                    {row.splitsend === true ? (
                      <Check size={16} style={{ color: "var(--color-success, #22c55e)" }} />
                    ) : row.splitsend === false ? (
                      <Minus size={16} style={{ opacity: 0.3 }} />
                    ) : (
                      <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>{row.splitsend}</span>
                    )}
                  </td>
                  <td style={{ textAlign: "center", padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
                    {row.splitwise === true ? (
                      <Check size={16} style={{ opacity: 0.4 }} />
                    ) : row.splitwise === false ? (
                      <Minus size={16} style={{ opacity: 0.3 }} />
                    ) : (
                      <span style={{ fontSize: "0.8rem", opacity: 0.4 }}>{row.splitwise}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom CTA */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem", opacity: 0.7 }}>
          Free. Private. Instant.
        </p>
        <p style={{ fontSize: "0.85rem", opacity: 0.4 }}>
          No accounts. No downloads. No nonsense.
        </p>
      </div>
    </main>
  );
}
