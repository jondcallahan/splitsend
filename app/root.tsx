import { useHotkey } from "@tanstack/react-hotkeys";
import { Analytics } from "@vercel/analytics/react";
import { Agentation } from "agentation";
import { useState } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "sileo";

import type { Route } from "./+types/root";
import { CommandPalette } from "./components/command-palette";
import type { Command } from "./components/command-palette";
import { HelpOverlay } from "./components/help-overlay";
import type { ShortcutGroup } from "./components/help-overlay";
import { Button } from "./components/ui";

import { KeyboardContext } from "./contexts/keyboard-context";

import "sileo/styles.css";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { href: "/favicon.svg", rel: "icon", type: "image/svg+xml" },
  { href: "https://fonts.googleapis.com", rel: "preconnect" },
  {
    crossOrigin: "anonymous",
    href: "https://fonts.gstatic.com",
    rel: "preconnect",
  },
  {
    href: "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=JetBrains+Mono:wght@400;500;700&display=swap",
    rel: "stylesheet",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <Analytics
          beforeSend={(event) => {
            const url = new URL(event.url);
            // Mask /g/:slug/admin/:adminToken and /g/:slug/m/:memberToken paths
            url.pathname = url.pathname.replace(
              /^\/g\/[^/]+\/admin\/[^/]+/,
              "/g/[slug]/admin/[adminToken]"
            ).replace(
              /^\/g\/[^/]+\/m\/[^/]+/,
              "/g/[slug]/m/[memberToken]"
            );
            return { ...event, url: url.toString() };
          }}
        />
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}

export default function App() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [shortcutGroups, setShortcutGroups] = useState<ShortcutGroup[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(false);

  const openCommandPalette = () => setCommandPaletteOpen(true);
  const openHelpOverlay = () => setHelpOverlayOpen(true);

  // Global hotkeys
  useHotkey("Mod+K", () => {
    setCommandPaletteOpen(true);
  });

  useHotkey("/", (e) => {
    e.preventDefault();
    setCommandPaletteOpen(true);
  }); // ignoreInputs defaults to true for single keys

  useHotkey({ key: "/", shift: true }, (e) => {
    e.preventDefault();
    setHelpOverlayOpen(true);
  }); // ignoreInputs defaults to true for single keys (even with shift)

  // Escape blurs inputs/textareas to enable keyboard shortcuts
  // Disable preventDefault/stopPropagation so native <dialog> Escape dismissal still works
  useHotkey(
    "Escape",
    (e) => {
      if (e.target instanceof HTMLElement) {
        e.target.blur();
      }
    },
    { ignoreInputs: false, preventDefault: false, stopPropagation: false }
  );

  return (
    <KeyboardContext.Provider
      value={{
        commands,
        openCommandPalette,
        openHelpOverlay,
        setCommands,
        setShortcutGroups,
        shortcutGroups,
      }}
    >
      <Toaster position="top-right" options={{
        fill: "#171717",
        styles: { description: "text-white/75!" },
      }} />
      <Outlet />

      {/* Keyboard hints — only visible on non-touch devices via CSS */}
      <div className="keyboard-hints">
        <Button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          $variant="outline"
          $size="small"
          title="Open command palette (⌘K or /)"
        >
          Search
        </Button>
        <Button
          type="button"
          onClick={() => setHelpOverlayOpen(true)}
          $variant="outline"
          $size="small"
          title="Show keyboard shortcuts (?)"
        >
          ?
        </Button>
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />
      <HelpOverlay
        isOpen={helpOverlayOpen}
        onClose={() => setHelpOverlayOpen(false)}
        groups={shortcutGroups}
      />
    </KeyboardContext.Provider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    ({ stack } = error);
  }

  return (
    <main className="container">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
