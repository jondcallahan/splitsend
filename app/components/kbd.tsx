import { formatForDisplay } from "~/lib/keyboard";

interface KbdProps {
  shortcut: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Display a keyboard shortcut as a styled <kbd> element
 */
export function Kbd({ shortcut, className, style }: KbdProps) {
  return (
    <kbd aria-hidden="true" className={className} data-kbd style={style}>
      {formatForDisplay(shortcut)}
    </kbd>
  );
}
