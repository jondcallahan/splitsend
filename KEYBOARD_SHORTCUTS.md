# Keyboard Shortcuts for BillSplit

A comprehensive keyboard navigation system has been added to make the SplitSend app fully usable without a mouse.

## Features Implemented

### 1. **Command Palette** (`⌘K` / `Ctrl+K` or `/`)

- Fuzzy search across all available commands
- Shows keyboard shortcuts for each command
- Arrow keys to navigate, Enter to execute, Escape to close
- Dynamically populated based on current route

### 2. **Help Overlay** (`?` / `Shift+/`)

- Displays all keyboard shortcuts organized by category
- Cross-platform key symbols (⌘ on Mac, Ctrl on Windows/Linux)
- Closes on Escape or backdrop click

### 3. **Inline Keyboard Hints**

- `<Kbd>` component displays shortcuts next to buttons and labels
- Provides visual feedback for available shortcuts

### 4. **Global Shortcuts** (Available on all pages)

| Shortcut        | Action                                      |
| --------------- | ------------------------------------------- |
| `⌘K` / `Ctrl+K` | Open command palette                        |
| `/`             | Open command palette                        |
| `?`             | Show keyboard shortcuts help                |
| `Escape`        | Blur input (enables shortcuts after typing) |

### 5. **Home Page Shortcuts**

| Shortcut | Action                                     |
| -------- | ------------------------------------------ |
| `N`      | Focus the "Name your group" input          |
| `Enter`  | Create group (native form submission)      |
| `1`-`9`  | Navigate to recent group (1st through 9th) |

### 6. **Admin Page Shortcuts** (Richest set of shortcuts)

| Shortcut         | Action                                      |
| ---------------- | ------------------------------------------- |
| `M`              | Focus "Add member" input                    |
| `E`              | Focus "Add expense" description field       |
| `R`              | Toggle rename group dialog                  |
| `C` then `1`-`9` | Copy invite link for member N               |
| `H`              | Navigate home                               |
| `Escape`         | Close any open dialog/overlay or blur input |

### 7. **Member Page Shortcuts** (Read-only view)

| Shortcut | Action        |
| -------- | ------------- |
| `H`      | Navigate home |

## Technical Implementation

### Components Created

1. **`app/components/CommandPalette.tsx`**
   - Modal overlay with fuzzy search
   - Keyboard navigation (arrows, enter, escape)
   - Backdrop click to close

2. **`app/components/HelpOverlay.tsx`**
   - Grid layout for shortcut categories
   - Cross-platform key formatting
   - Accessible and keyboard-friendly

3. **`app/components/Kbd.tsx`**
   - Inline keyboard shortcut display component
   - Styled `<kbd>` element with platform-specific symbols

4. **`app/lib/keyboard.ts`**
   - `formatForDisplay()` - Converts shortcuts to platform-specific symbols
   - Cross-platform modifier key handling
   - Platform detection utilities

5. **`app/contexts/KeyboardContext.tsx`**
   - React context for sharing commands and shortcuts across routes
   - Provides `useKeyboard()` hook for routes to register their commands

### Route Integration

Each route registers its commands and shortcuts via `useKeyboard()` hook:

```typescript
const { setCommands, setShortcutGroups } = useKeyboard();

useEffect(() => {
  // Register commands for command palette
  setCommands([...]);

  // Register shortcuts for help overlay
  setShortcutGroups([...]);
}, [dependencies]);
```

### Styling

All keyboard-related styles are in `app/app.css`:

- Command palette modal with smooth animations
- Help overlay grid layout
- `<kbd>` element styling with platform-specific appearance
- Enhanced focus indicators for better keyboard navigation
- Fade-in/slide-down animations

## User Experience Highlights

1. **Escape Key Behavior**: When focused on an input, pressing Escape blurs the input, allowing you to immediately use other keyboard shortcuts without clicking elsewhere.

2. **Smart Context Awareness**: Shortcuts like `/` and `?` are disabled when typing in inputs to avoid conflicts.

3. **Sequential Chords**: The `C` then `1`-`9` pattern provides a discoverable way to copy member invite links without memorizing 9 different shortcuts.

4. **Visual Feedback**:
   - Toast notifications for clipboard actions
   - Active state highlighting in command palette
   - Subtle `<Kbd>` hints next to interactive elements

5. **Cross-Platform Compatibility**: Automatically adapts keyboard symbols based on platform (macOS vs Windows/Linux).

## Dependencies

- `@tanstack/react-hotkeys` (v0.1.0) - Keyboard shortcut management
- Uses OAT UI's native dialog system for modals (no custom state management needed)

## Verification

To test the keyboard shortcuts:

1. Start the dev server: `bun run dev`
2. Open http://localhost:5173
3. Press `?` to see all available shortcuts
4. Press `⌘K` / `Ctrl+K` to open the command palette
5. Create a group and navigate to admin page to test admin-specific shortcuts
6. Try pressing `Escape` while focused in an input, then use a shortcut like `R` or `M`

## Future Enhancements

Potential additions:

- `G` then `H` for "Go Home" (Vim-style navigation)
- `G` then `G` to scroll to top
- `Shift+G` to scroll to bottom
- Arrow key navigation for member/expense lists
- `J`/`K` for Vim-style up/down navigation
- Quick expense editing with keyboard-only flow
