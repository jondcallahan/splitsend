import { createContext, useContext } from "react";

import type { Command } from "~/components/CommandPalette";
import type { ShortcutGroup } from "~/components/HelpOverlay";

interface KeyboardContextValue {
  commands: Command[];
  setCommands: (commands: Command[]) => void;
  shortcutGroups: ShortcutGroup[];
  setShortcutGroups: (groups: ShortcutGroup[]) => void;
  openCommandPalette: () => void;
  openHelpOverlay: () => void;
}

export const KeyboardContext = createContext<KeyboardContextValue | null>(null);

export function useKeyboard() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error("useKeyboard must be used within KeyboardProvider");
  }
  return context;
}
