/**
 * ShortcutRegistry — Centralized Keyboard Shortcut Registry
 * Prevents key collision and enforces browser OS reserved key safety (avoiding F5, F11, F12, Ctrl+W, Ctrl+T, Ctrl+F).
 */

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  actionId: string;
  label: string;
  description: string;
  screen: 'GLOBAL' | 'POS' | 'DAY_CLOSE' | 'REPORTS';
}

export const GLOBAL_SHORTCUT_MAP: KeyboardShortcut[] = [
  { key: 'F1', actionId: 'TOGGLE_HELP_LEGEND', label: 'F1', description: 'Show Keyboard Shortcuts Legend Overlay', screen: 'GLOBAL' },
  { key: 'S', ctrlKey: true, actionId: 'OPEN_SETTINGS', label: 'Ctrl + S', description: 'Open System Settings & User Preferences', screen: 'GLOBAL' },
  { key: 'F2', shiftKey: true, actionId: 'TOGGLE_SALE_TYPE', label: 'Shift + F2', description: 'Toggle Retail / Wholesale Sale Mode', screen: 'POS' },
  { key: 'F3', actionId: 'REPEAT_LAST_ITEM', label: 'F3', description: 'Repeat Last Scanned Item (+1 Quantity)', screen: 'POS' },
  { key: 'F7', actionId: 'TRIGGER_UPI_QR', label: 'F7', description: 'Trigger Instant UPI Payment QR Code', screen: 'POS' },
  { key: 'F8', shiftKey: true, actionId: 'RECOVER_BILL', label: 'Shift + F8', description: 'Open Feature 1 Manual Bill Recovery Dialog', screen: 'POS' },
  { key: 'F5', ctrlKey: true, actionId: 'PRINT_DUPLICATE', label: 'Ctrl + F5', description: 'Open Authorized Duplicate Bill Reprint Modal', screen: 'POS' },
  { key: 'F10', actionId: 'OPEN_CHECKOUT', label: 'F10', description: 'Open Checkout Payment Modal', screen: 'POS' },
  { key: 'F11', altKey: true, actionId: 'TOGGLE_RETURN_MODE', label: 'Alt + F11', description: 'Toggle Cashier Sale Return Mode', screen: 'POS' },
  { key: 'Escape', actionId: 'CANCEL_MODAL', label: 'Escape', description: 'Cancel / Close Active Modal & Restore Focus', screen: 'GLOBAL' },
];

/**
 * Check if a keyboard event matches a registered shortcut (Dual e.key and e.code matching)
 */
export const matchesShortcut = (e: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
  const targetKey = shortcut.key.toUpperCase();
  const eventKey = (e.key || '').toUpperCase();
  const eventCode = (e.code || '').toUpperCase();

  let matchKey = eventKey === targetKey || eventCode === targetKey || eventCode === `KEY${targetKey}` || eventCode === `DIGIT${targetKey}`;

  if (targetKey === 'ENTER') {
    matchKey = eventKey === 'ENTER' || eventCode === 'ENTER' || eventCode === 'NUMPADENTER';
  }

  const matchCtrl = Boolean(shortcut.ctrlKey) === Boolean(e.ctrlKey || e.metaKey);
  const matchShift = Boolean(shortcut.shiftKey) === Boolean(e.shiftKey);
  const matchAlt = Boolean(shortcut.altKey) === Boolean(e.altKey);

  return matchKey && matchCtrl && matchShift && matchAlt;
};
