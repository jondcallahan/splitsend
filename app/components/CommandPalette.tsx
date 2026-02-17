import { useState, useEffect, useRef } from "react";

import { formatForDisplay } from "~/lib/keyboard";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  group?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

/**
 * Fuzzy match a query against a string
 */
function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

/**
 * A command palette for quick actions and navigation
 * Opened with Mod+K or /, closed with Escape
 */
export function CommandPalette({
  isOpen,
  onClose,
  commands,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredCommands = query
    ? commands.filter((cmd) => fuzzyMatch(query, cmd.label))
    : commands;

  // Reset state and focus when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  // Adjust selected index if it's out of bounds
  const currentIndex = Math.min(
    selectedIndex,
    Math.max(0, filteredCommands.length - 1)
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        Math.min(prev + 1, filteredCommands.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const command = filteredCommands[currentIndex];
      if (command) {
        command.action();
        onClose();
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {return null;}

  return (
    <div className="command-palette-backdrop" onClick={handleBackdropClick}>
      <div className="command-palette-content" onKeyDown={handleKeyDown}>
        <div className="command-palette-search">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="command-palette-input"
            autoComplete="off"
          />
        </div>

        <div className="command-palette-results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">
              No commands found for "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                type="button"
                className={`command-palette-item ${
                  index === currentIndex ? "active" : ""
                }`}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="command-palette-label">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd data-kbd className="command-palette-shortcut">
                    {formatForDisplay(cmd.shortcut)}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <span>
            <kbd data-kbd>↑</kbd> <kbd data-kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd data-kbd>↵</kbd> to select
          </span>
          <span>
            <kbd data-kbd>Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
