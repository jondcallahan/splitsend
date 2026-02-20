import { useHotkey } from "@tanstack/react-hotkeys";
import type { RegisterableHotkey } from "@tanstack/react-hotkeys";
import {
  Wallet,
  Shield,
  User,
  LinkIcon,
  ReceiptText,
  Zap,
  X,
  ArrowRightLeft,
  Check,
  Minus,
  Home as HomeIcon,
  Plane,
  PartyPopper,
  Heart,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Form, redirect, useNavigation, data } from "react-router";

import type { Command } from "~/components/command-palette";
import type { ShortcutGroup } from "~/components/help-overlay";
import { AlertDialog, AlertDialogClose, Button } from "~/components/ui";
import { useKeyboard } from "~/contexts/keyboard-context";
import { GroupDAO } from "~/dao/group.dao.server";
import {
  parseRecentGroups,
  removeRecentGroup,
} from "~/lib/recent-groups.server";

import type { Route } from "./+types/home";

// ---------------------------------------------------------------------------
// FAQ content — used both for the visible section and the JSON-LD schema
// ---------------------------------------------------------------------------
const FAQ_ITEMS = [
  {
    a: "No. SplitSend requires no account or sign-up — not for you, and not for anyone in your group. Just create a group and share the link.",
    q: "Do I need to create an account to use SplitSend?",
  },
  {
    a: "No. SplitSend is a web app. Every member accesses their private link in a browser. Nothing to install.",
    q: "Does anyone need to download an app?",
  },
  {
    a: "Yes, completely free. No ads, no subscription, no freemium limits.",
    q: "Is SplitSend free?",
  },
  {
    a: "When multiple people owe each other money, the naive approach requires everyone to pay everyone back individually. SplitSend calculates the minimum number of transfers needed to settle all balances — so a group of four might need 3 payments instead of 6.",
    q: "How does SplitSend simplify debts?",
  },
  {
    a: "Yes. Unlike Splitwise, SplitSend doesn't require accounts, has no ads, no transaction limits, and includes smart debt simplification for free — not as a paid upgrade.",
    q: "Is SplitSend a good Splitwise alternative?",
  },
  {
    a: "When you create a group, you get an admin link. You add your members by name, and each member gets their own private link that shows only their balances and lets them add expenses. No passwords, no email addresses needed.",
    q: "How does the shared link work?",
  },
  {
    a: "Group and member pages are never indexed by search engines. Each person's link is unique and unguessable — there's no public directory of groups.",
    q: "Is my data private?",
  },
];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export function meta({}: Route.MetaArgs) {
  return [
    {
      title: "SplitSend — Free Bill Splitter. No Account, No App, Just a Link.",
    },
    {
      content:
        "Split expenses with friends, roommates, or on a group trip — no account needed. Share a private link, track who owes what, and settle up in seconds. Free forever.",
      name: "description",
    },
  ];
}

// ---------------------------------------------------------------------------
// Loader / Action
// ---------------------------------------------------------------------------
export async function loader({ request }: Route.LoaderArgs) {
  const recentGroups = parseRecentGroups(request.headers.get("Cookie"));
  return { recentGroups };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "remove-recent") {
    const urlToRemove = String(formData.get("url"));
    const recentGroups = parseRecentGroups(request.headers.get("Cookie"));
    const cookie = removeRecentGroup(recentGroups, urlToRemove);

    return data({ success: true }, { headers: { "Set-Cookie": cookie } });
  }

  const name = String(formData.get("name")).trim();

  if (!name) {
    return { error: "Please enter a group name" };
  }

  const group = await GroupDAO.create(name);
  return redirect(`/g/${group.slug}/admin/${group.admin_token}`);
}

// ---------------------------------------------------------------------------
// Phone mockup shell
// ---------------------------------------------------------------------------
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#1c1c1e",
        borderRadius: 40,
        boxShadow:
          "0 30px 70px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)",
        flexShrink: 0,
        padding: "10px",
        width: 210,
      }}
    >
      {/* Dynamic island */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: 22,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#111",
            borderRadius: 8,
            height: 10,
            width: 68,
          }}
        />
      </div>

      {/* Screen */}
      <div
        style={{
          background: "var(--background, #f8f9fa)",
          borderRadius: 28,
          fontSize: "0.68rem",
          lineHeight: 1.4,
          minHeight: 400,
          overflow: "hidden",
          padding: "0.75rem 0.6rem",
        }}
      >
        {children}
      </div>

      {/* Home indicator */}
      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: 22,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#444",
            borderRadius: 3,
            height: 3,
            width: 64,
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------
export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { recentGroups } = loaderData;
  const inputRef = useRef<HTMLInputElement>(null);
  const { setCommands, setShortcutGroups } = useKeyboard();
  const [dismissingUrl, setDismissingUrl] = useState<string | null>(null);

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
      {/* JSON-LD FAQ structured data */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
              "@type": "Question",
              acceptedAnswer: { "@type": "Answer", text: a },
              name: q,
            })),
          }),
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
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
            maxWidth: 480,
            opacity: 0.8,
          }}
        >
          Split expenses with friends. No account required.
        </p>
        <p
          style={{
            fontSize: "0.95rem",
            lineHeight: 1.6,
            margin: "0.5rem auto 0",
            maxWidth: 460,
            opacity: 0.55,
          }}
        >
          Share a private link. Everyone adds expenses. SplitSend figures out
          who owes who and minimizes the payments to settle up. Free, private,
          instant.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create Group — the main action                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ marginBottom: "3rem" }}>
        <Form method="post">
          <fieldset disabled={isSubmitting}>
            <label htmlFor="name">Name your group</label>
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

            <Button
              type="submit"
              className="flex items-center justify-center gap-2"
              style={{ marginTop: "1rem", width: "100%" }}
            >
              {isSubmitting ? "Creating…" : "Create Group — It's Free"}
            </Button>
          </fieldset>
        </Form>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent Groups                                                        */}
      {/* ------------------------------------------------------------------ */}
      {recentGroups.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <h3
            style={{
              fontSize: "0.9rem",
              letterSpacing: "0.05em",
              marginBottom: "1rem",
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
            {recentGroups.map((g) => (
              <div key={g.url} style={{ position: "relative" }}>
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
                  {g.role === "admin" ? (
                    <Shield size={18} />
                  ) : (
                    <User size={18} />
                  )}
                  <div style={{ flex: 1 }}>
                    <strong>{g.name}</strong>
                    <div style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                      {g.role === "admin"
                        ? "Admin"
                        : `Member · ${g.memberName}`}
                    </div>
                  </div>
                </a>
                <Button
                  type="button"
                  $variant="ghost"
                  $size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    setDismissingUrl(g.url);
                  }}
                  style={{
                    opacity: 0.5,
                    position: "absolute",
                    right: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                  aria-label={`Dismiss ${g.name}`}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            {/* Remove group confirmation — single AlertDialog driven by state */}
            {(() => {
              const dismissing = recentGroups.find(
                (g) => g.url === dismissingUrl
              );
              return (
                <AlertDialog
                  title="Remove from recent groups?"
                  description={
                    dismissing
                      ? `This will remove "${dismissing.name}" from your recent groups list. You can still access it via the original link.`
                      : ""
                  }
                  open={dismissingUrl !== null}
                  onOpenChange={(open) => {
                    if (!open) {setDismissingUrl(null);}
                  }}
                >
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove-recent" />
                    <input
                      type="hidden"
                      name="url"
                      value={dismissingUrl ?? ""}
                    />
                    <div className="flex gap-3 justify-end">
                      <AlertDialogClose $variant="outline">
                        Cancel
                      </AlertDialogClose>
                      <Button type="submit" $variant="danger">
                        Remove
                      </Button>
                    </div>
                  </Form>
                </AlertDialog>
              );
            })()}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Device mockups                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section style={{ marginBottom: "3rem" }}>
        <p
          style={{
            fontSize: "0.78rem",
            letterSpacing: "0.08em",
            marginBottom: "1.75rem",
            opacity: 0.4,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          What your group members see
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1.5rem",
            justifyContent: "center",
          }}
        >
          {/* Phone 1 — Balance view */}
          <PhoneMockup>
            <a
              style={{
                color: "inherit",
                fontSize: "0.65rem",
                opacity: 0.45,
                textDecoration: "none",
              }}
            >
              ← SplitSend
            </a>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                marginTop: "0.2rem",
              }}
            >
              Ski Trip 2026
            </div>
            <div style={{ marginBottom: "0.75rem", opacity: 0.55 }}>
              Logged in as Alex
            </div>

            <div
              className="card"
              style={{ marginBottom: "0.5rem", padding: "0.6rem" }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  fontWeight: 700,
                  gap: "0.3rem",
                  marginBottom: "0.5rem",
                }}
              >
                <ArrowRightLeft size={12} /> Your Balances
              </div>
              <div
                style={{
                  borderBottom: "1px solid var(--border)",
                  padding: "0.3rem 0",
                }}
              >
                <span>
                  Mike owes you{" "}
                  <strong style={{ color: "var(--color-success, #2e7d32)" }}>
                    $45.00
                  </strong>
                </span>
              </div>
              <div style={{ padding: "0.3rem 0" }}>
                <span>
                  You owe Sarah{" "}
                  <strong style={{ color: "var(--color-error, #d32f2f)" }}>
                    $12.50
                  </strong>
                </span>
              </div>
            </div>

            <div className="card" style={{ padding: "0.6rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>
                Expenses
              </div>
              {[
                { amount: "$320.00", label: "Hotel", paidBy: "Alex" },
                { amount: "$180.00", label: "Lift tickets", paidBy: "Mike" },
                { amount: "$95.00", label: "Dinner", paidBy: "Sarah" },
              ].map((e) => (
                <div
                  key={e.label}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    opacity: 0.75,
                    padding: "0.25rem 0",
                  }}
                >
                  <span>{e.label}</span>
                  <span style={{ fontWeight: 600 }}>{e.amount}</span>
                </div>
              ))}
            </div>
          </PhoneMockup>

          {/* Phone 2 — Add expense view */}
          <PhoneMockup>
            <a
              style={{
                color: "inherit",
                fontSize: "0.65rem",
                opacity: 0.45,
                textDecoration: "none",
              }}
            >
              ← SplitSend
            </a>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                marginTop: "0.2rem",
              }}
            >
              Ski Trip 2026
            </div>
            <div style={{ marginBottom: "0.75rem", opacity: 0.55 }}>
              Logged in as Mike
            </div>

            <div
              className="card"
              style={{ marginBottom: "0.5rem", padding: "0.6rem" }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  fontWeight: 700,
                  gap: "0.3rem",
                  marginBottom: "0.5rem",
                }}
              >
                <ArrowRightLeft size={12} /> Your Balances
              </div>
              <div style={{ padding: "0.3rem 0" }}>
                <span style={{ opacity: 0.6 }}>You're all settled up! 🎉</span>
              </div>
            </div>

            <div className="card" style={{ padding: "0.6rem" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
                Add Expense
              </div>
              <div style={{ marginBottom: "0.35rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    marginBottom: "0.2rem",
                    opacity: 0.5,
                  }}
                >
                  What was it for?
                </div>
                <div
                  style={{
                    background: "var(--muted, #f5f5f5)",
                    borderRadius: 6,
                    opacity: 0.8,
                    padding: "0.35rem 0.5rem",
                  }}
                >
                  Après-ski drinks
                </div>
              </div>
              <div style={{ marginBottom: "0.35rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    marginBottom: "0.2rem",
                    opacity: 0.5,
                  }}
                >
                  Amount
                </div>
                <div
                  style={{
                    background: "var(--muted, #f5f5f5)",
                    borderRadius: 6,
                    opacity: 0.8,
                    padding: "0.35rem 0.5rem",
                  }}
                >
                  $62.00
                </div>
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    marginBottom: "0.2rem",
                    opacity: 0.5,
                  }}
                >
                  Who paid?
                </div>
                <div
                  style={{
                    background: "var(--muted, #f5f5f5)",
                    borderRadius: 6,
                    opacity: 0.8,
                    padding: "0.35rem 0.5rem",
                  }}
                >
                  Mike (you)
                </div>
              </div>
              <Button
                style={{
                  fontSize: "0.65rem",
                  padding: "0.4rem 0",
                  width: "100%",
                }}
              >
                Add Expense
              </Button>
            </div>
          </PhoneMockup>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How it works                                                         */}
      {/* ------------------------------------------------------------------ */}
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
          How to split bills with your group
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
              Each member gets a private link. No sign-up, nothing to install.
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

      {/* ------------------------------------------------------------------ */}
      {/* Use cases                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          marginBottom: "2.5rem",
          paddingTop: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            letterSpacing: "-0.01em",
            marginBottom: "0.5rem",
            textAlign: "center",
          }}
        >
          Works for any shared expense
        </h2>
        <p
          style={{
            fontSize: "0.95rem",
            margin: "0 auto 1.5rem",
            maxWidth: 420,
            opacity: 0.55,
            textAlign: "center",
          }}
        >
          No matter the occasion, everyone gets their own link — no accounts, no
          app downloads required.
        </p>
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {[
            {
              body: "Track shared groceries, utilities, and rent month to month without a spreadsheet or awkward conversations.",
              icon: <HomeIcon size={20} style={{ opacity: 0.6 }} />,
              title: "Splitting rent and bills with roommates",
            },
            {
              body: "Hotels, restaurants, activities — log as you go, settle when you're back. No one needs to download a thing.",
              icon: <Plane size={20} style={{ opacity: 0.6 }} />,
              title: "Group trips and vacations",
            },
            {
              body: "Bachelorette parties, ski weekends, birthday dinners. One link for the whole crew.",
              icon: <PartyPopper size={20} style={{ opacity: 0.6 }} />,
              title: "Group events",
            },
            {
              body: "Keep track of shared costs without a subscription or asking your partner to sign up for yet another app.",
              icon: <Heart size={20} style={{ opacity: 0.6 }} />,
              title: "Couples and households",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="card"
              style={{ padding: "1.1rem" }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.4rem",
                }}
              >
                {item.icon}
                <strong style={{ fontSize: "0.9rem" }}>{item.title}</strong>
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                  margin: 0,
                  opacity: 0.6,
                }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Smart Settlements                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        style={{
          borderTop: "1px solid var(--border)",
          marginBottom: "2.5rem",
          paddingTop: "2rem",
        }}
      >
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <ArrowRightLeft
            size={28}
            style={{ marginBottom: "0.5rem", opacity: 0.5 }}
          />
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
            fewest payments possible. This is a feature Splitwise locks behind a
            Pro subscription — here it's always free.
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
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
                opacity: 0.4,
                textTransform: "uppercase",
              }}
            >
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
            <div
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
                opacity: 0.7,
                textTransform: "uppercase",
              }}
            >
              With SplitSend
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>3</div>
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

      {/* ------------------------------------------------------------------ */}
      {/* SplitSend vs Splitwise                                               */}
      {/* ------------------------------------------------------------------ */}
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
            marginBottom: "0.75rem",
            textAlign: "center",
          }}
        >
          The free Splitwise alternative — no signup, no ads, no limits
        </h2>
        <p
          style={{
            fontSize: "0.9rem",
            lineHeight: 1.6,
            margin: "0 auto 1.5rem",
            maxWidth: 480,
            opacity: 0.55,
            textAlign: "center",
          }}
        >
          Splitwise now limits free users to 3 expenses per day and shows ads
          throughout the app. SplitSend is completely free, has no ads, and
          requires no account from anyone in your group.
        </p>
        <div style={{ margin: "0 auto", maxWidth: 520 }}>
          <table
            style={{
              borderCollapse: "collapse",
              fontSize: "0.9rem",
              width: "100%",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: "2px solid var(--border)",
                    opacity: 0.5,
                    padding: "0.5rem 0.75rem",
                    textAlign: "left",
                  }}
                />
                <th
                  style={{
                    borderBottom: "2px solid var(--border)",
                    fontWeight: 700,
                    padding: "0.5rem 0.75rem",
                    textAlign: "center",
                  }}
                >
                  SplitSend
                </th>
                <th
                  style={{
                    borderBottom: "2px solid var(--border)",
                    opacity: 0.5,
                    padding: "0.5rem 0.75rem",
                    textAlign: "center",
                  }}
                >
                  Splitwise
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  feature: "Account required",
                  splitsend: false,
                  splitwise: true,
                },
                {
                  feature: "App download needed",
                  splitsend: false,
                  splitwise: true,
                },
                { feature: "Free", splitsend: true, splitwise: "Freemium" },
                {
                  feature: "Smart debt simplification",
                  splitsend: true,
                  splitwise: "Pro only",
                },
                {
                  feature: "Works via shared link",
                  splitsend: true,
                  splitwise: false,
                },
                {
                  feature: "Everyone must sign up",
                  splitsend: false,
                  splitwise: true,
                },
                { feature: "Ads", splitsend: false, splitwise: true },
              ].map((row) => (
                <tr key={row.feature}>
                  <td
                    style={{
                      borderBottom: "1px solid var(--border)",
                      padding: "0.5rem 0.75rem",
                    }}
                  >
                    {row.feature}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid var(--border)",
                      padding: "0.5rem 0.75rem",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      {row.splitsend === true ? (
                        <Check
                          size={16}
                          style={{ color: "var(--color-success, #22c55e)" }}
                        />
                      ) : (row.splitsend === false ? (
                        <Minus size={16} style={{ opacity: 0.3 }} />
                      ) : (
                        <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>
                          {row.splitsend}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid var(--border)",
                      padding: "0.5rem 0.75rem",
                    }}
                  >
                    <div
                      style={{
                        alignItems: "center",
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      {row.splitwise === true ? (
                        <Check size={16} style={{ opacity: 0.4 }} />
                      ) : (row.splitwise === false ? (
                        <Minus size={16} style={{ opacity: 0.3 }} />
                      ) : (
                        <span style={{ fontSize: "0.8rem", opacity: 0.4 }}>
                          {row.splitwise}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ                                                                  */}
      {/* ------------------------------------------------------------------ */}
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
          Frequently asked questions
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <div
              key={q}
              style={{
                borderBottom:
                  i < FAQ_ITEMS.length - 1 ? "1px solid var(--border)" : "none",
                padding: "1rem 0",
              }}
            >
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  margin: "0 0 0.35rem",
                }}
              >
                {q}
              </h3>
              <p
                style={{
                  fontSize: "0.88rem",
                  lineHeight: 1.6,
                  margin: 0,
                  opacity: 0.6,
                }}
              >
                {a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom CTA                                                           */}
      {/* ------------------------------------------------------------------ */}
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
