import { useHotkey } from "@tanstack/react-hotkeys";
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
import { Kbd } from "./components/kbd";
import { KeyboardContext } from "./contexts/keyboard-context";

import "sileo/styles.css";
import "@knadh/oat/oat.min.css";
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
  useHotkey(
    "Escape",
    (e) => {
      if (e.target instanceof HTMLElement) {
        e.target.blur();
      }
    },
    { ignoreInputs: false } // Override default to work inside inputs
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
      <Toaster position="top-right" />
      <Outlet />

      {/* Keyboard hints */}
      <div className="keyboard-hints">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="outline small"
          title="Open command palette"
        >
          <span style={{ fontSize: "0.85rem", marginRight: "0.25rem" }}>
            Search
          </span>
          <Kbd shortcut="Mod+K" style={{ fontSize: "0.75rem" }} />
        </button>
        <button
          type="button"
          onClick={() => setHelpOverlayOpen(true)}
          className="outline small"
          title="Show keyboard shortcuts"
        >
          <Kbd shortcut="?" style={{ fontSize: "0.75rem" }} />
        </button>
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
