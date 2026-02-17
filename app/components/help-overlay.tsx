import { formatForDisplay } from "~/lib/keyboard";

export interface ShortcutGroup {
  title: string;
  shortcuts: {
    key: string;
    description: string;
  }[];
}

interface HelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  groups: ShortcutGroup[];
}

/**
 * A keyboard shortcut cheatsheet overlay
 * Opened with ? key, closed with Escape or backdrop click
 */
export function HelpOverlay({ isOpen, onClose, groups }: HelpOverlayProps) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="help-overlay-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="help-overlay-content">
        <header className="help-overlay-header">
          <h2>Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="outline"
            style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem" }}
          >
            Close
          </button>
        </header>

        <div className="help-overlay-body">
          {groups.map((group) => (
            <section key={group.title} className="help-overlay-group">
              <h3>{group.title}</h3>
              <dl className="help-overlay-list">
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="help-overlay-item">
                    <dt>
                      <kbd data-kbd>{formatForDisplay(shortcut.key)}</kbd>
                    </dt>
                    <dd>{shortcut.description}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <footer className="help-overlay-footer">
          <p>
            Press <kbd data-kbd>Esc</kbd> or click outside to close
          </p>
        </footer>
      </div>
    </div>
  );
}
