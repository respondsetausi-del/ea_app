/**
 * Shared surface language.
 *
 * Established on the sidebar and reused across Settings, Quotes and MetaTrader
 * so the screens don't drift apart again: flat dark grounds, hairline edges,
 * capsules for anything interactive, and accent spent only on the active item.
 */

export const SURFACE = {
  /** Screen ground. Flat — no gradient wash behind content. */
  ground: '#0B0B0C',
  /** Raised block: settings groups, list rows, account cards. */
  card: 'rgba(255,255,255,0.035)',
  /** Inset control inside a card, in its resting state. */
  control: 'rgba(255,255,255,0.03)',
  /** The single edge weight used everywhere. */
  hairline: 'rgba(255,255,255,0.10)',
} as const;

export const TEXT = {
  primary: '#FFFFFF',
  /** Secondary labels, inactive controls. */
  muted: 'rgba(255,255,255,0.45)',
  /** Group captions and metadata. */
  faint: 'rgba(255,255,255,0.35)',
  /** Version strings and other near-silent text. */
  ghost: 'rgba(255,255,255,0.22)',
} as const;

export const RADIUS = {
  /** Anything tappable. Clamps to half-height at any size. */
  pill: 999,
  /** Grouping containers, which stay rectangular so they read as containers. */
  card: 16,
} as const;

/** Group caption — "MENU", "THEME", "TOOLS". */
export const GROUP_LABEL = {
  color: TEXT.faint,
  fontSize: 10,
  fontWeight: '600',
  letterSpacing: 2,
} as const;

/** Accent treatment for the selected item in a group. */
export const activeTint = (accentRgb: string) => ({
  backgroundColor: 'rgba(' + accentRgb + ', 0.14)',
  borderColor: 'rgba(' + accentRgb + ', 0.4)',
});
