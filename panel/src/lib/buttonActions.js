// What a reply button does when tapped, on an offer or on a WhatsApp template.
// Mirrors posterButtonActions in the bot's scheduler.go, which rejects
// anything not listed there.
export const BUTTON_ACTIONS = [
  { value: 'view_offers', label: 'Show current offers' },
  { value: 'view_menu', label: 'Show the menu' },
  { value: 'visit', label: 'Show address & directions' },
  { value: 'main_menu', label: 'Show the welcome message' },
];

export const actionLabel = (value) =>
  BUTTON_ACTIONS.find((a) => a.value === value)?.label || value;

// A sensible action for a button from its text, so "Menu" starts on the menu.
export function guessAction(text) {
  const t = (text || '').toLowerCase();
  if (/menu/.test(t)) return 'view_menu';
  if (/address|direction|visit|location|map|find us/.test(t)) return 'visit';
  if (/offer|deal/.test(t)) return 'view_offers';
  return 'main_menu';
}
