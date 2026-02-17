/**
 * Keyboard utilities for cross-platform keyboard shortcut display and handling
 */

const isMac =
  typeof window !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;

/**
 * Format keyboard shortcuts for display
 * Converts mod+k -> ⌘K on Mac, Ctrl+K on Windows/Linux
 */
export function formatForDisplay(shortcut: string): string {
  if (!shortcut) {return "";}

  const parts = shortcut.split("+").map((part) => part.trim());
  const formatted = parts.map((part) => {
    switch (part.toLowerCase()) {
      case "mod":
      case "meta": {
        return isMac ? "⌘" : "Ctrl";
      }
      case "ctrl": {
        return isMac ? "⌃" : "Ctrl";
      }
      case "alt": {
        return isMac ? "⌥" : "Alt";
      }
      case "shift": {
        return isMac ? "⇧" : "Shift";
      }
      case "enter": {
        return "↵";
      }
      case "escape":
      case "esc": {
        return "Esc";
      }
      case "backspace": {
        return "⌫";
      }
      case "delete": {
        return "⌦";
      }
      case "tab": {
        return "⇥";
      }
      case "space": {
        return "Space";
      }
      case "arrowup":
      case "up": {
        return "↑";
      }
      case "arrowdown":
      case "down": {
        return "↓";
      }
      case "arrowleft":
      case "left": {
        return "←";
      }
      case "arrowright":
      case "right": {
        return "→";
      }
      default: {
        return part.toUpperCase();
      }
    }
  });

  return formatted.join(isMac ? "" : "+");
}

/**
 * Check if the current platform is Mac
 */
export function isMacPlatform(): boolean {
  return isMac;
}

/**
 * Get the modifier key for the current platform
 */
export function getModKey(): string {
  return isMac ? "⌘" : "Ctrl";
}
