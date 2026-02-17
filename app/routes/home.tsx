import { useHotkey } from "@tanstack/react-hotkeys";
import {
  Wallet,
  Shield,
  User,
  LinkIcon,
  UserPlus,
  ReceiptText,
  Zap,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Form, redirect, useNavigation } from "react-router";

import type { Command } from "~/components/CommandPalette";
import type { ShortcutGroup } from "~/components/HelpOverlay";
import { Kbd } from "~/components/Kbd";
import { useKeyboard } from "~/contexts/KeyboardContext";
import { GroupDAO } from "~/dao/group.dao.server";
import { parseRecentGroups } from "~/lib/recent-groups.server";

import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SplitSend — Split expenses without the signup" },
    {
      content:
        "Split bills with friends in seconds. No accounts, no app downloads, no email required. Just create a group and share a link.",
      name: "description",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const recentGroups = parseRecentGroups(request.headers.get("Cookie"));
  return { recentGroups };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = String(formData.get("name")).trim();

  if (!name) {
    return { error: "Please enter a group name" };
  }

  const group = GroupDAO.create(name);
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
  recentGroups.forEach((group, index) => {
    const key = String(index + 1) as any;
    if (index < 9) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useHotkey(key, () => {
        window.location.href = group.url;
      });
    }
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
          { key: "Mod+K", description: "Open command palette" },
          { key: "/", description: "Open command palette" },
          { key: "?", description: "Show keyboard shortcuts" },
        ],
        title: "Navigation",
      },
      {
        shortcuts: [
          { key: "N", description: "Focus name input" },
          { key: "Enter", description: "Create group" },
        ],
        title: "Actions",
      },
    ];

    if (recentGroups.length > 0) {
      shortcuts.push({
        shortcuts: recentGroups.slice(0, 9).map((group, index) => ({
          key: String(index + 1),
          description: `Go to ${group.name}`,
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
            maxWidth: 420,
            opacity: 0.7,
          }}
        >
          Split expenses without the signup.
        </p>
      </div>

      {/* Create Group — the main action */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <Form method="post">
          <fieldset disabled={isSubmitting}>
            <label htmlFor="name">
              Name your group{" "}
              <Kbd
                shortcut="N"
                style={{ marginLeft: "0.5rem", opacity: 0.6 }}
              />
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
              {isSubmitting ? "Creating…" : "Create Group — it's free"}
              <Kbd shortcut="Mod+Enter" style={{ opacity: 0.6 }} />
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
            {recentGroups.map((g, index) => (
              <a
                key={g.url}
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
                {index < 9 && (
                  <Kbd shortcut={String(index + 1)} style={{ opacity: 0.5 }} />
                )}
              </a>
            ))}
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
              Takes two seconds. No account needed.
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
              Each member gets their own private link.
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
              Anyone can add. We calculate who owes what.
            </small>
          </div>
        </div>
      </section>

      {/* Why SplitSend */}
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
          The other apps make you work for it
        </h2>
        <div
          style={{
            display: "grid",
            gap: "0 2rem",
            gridTemplateColumns: "1fr 1fr",
            margin: "0 auto",
            maxWidth: 520,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "0.85rem",
                letterSpacing: "0.05em",
                marginBottom: "0.75rem",
                opacity: 0.4,
                textTransform: "uppercase",
              }}
            >
              Them
            </h3>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                opacity: 0.5,
                padding: 0,
              }}
            >
              {[
                "Download the app",
                "Create an account",
                "Verify your email",
                "Add your phone number",
                "Find your friends",
                "Hope they sign up too",
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    padding: "0.4rem 0",
                    textDecoration: "line-through",
                  }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3
              style={{
                fontSize: "0.85rem",
                letterSpacing: "0.05em",
                marginBottom: "0.75rem",
                opacity: 0.7,
                textTransform: "uppercase",
              }}
            >
              SplitSend
            </h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {["Name your group", "Add members", "Share the link", "Done"].map(
                (item, i) => (
                  <li
                    key={item}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      fontWeight: i === 3 ? 700 : 400,
                      padding: "0.4rem 0",
                    }}
                  >
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <p style={{ fontSize: "1rem", marginBottom: "0.5rem", opacity: 0.6 }}>
          No accounts. No app downloads. No email required.
        </p>
        <p style={{ fontSize: "0.85rem", opacity: 0.4 }}>
          Just a link. That's it.
        </p>
      </div>
    </main>
  );
}
