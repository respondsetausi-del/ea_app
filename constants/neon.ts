/**
 * The home screen's visual language, lifted out so the rest of the app can
 * speak it too.
 *
 * Home had all of this inline: the accent wash behind the page, the capsule
 * cards on a near-black ground, the spinning conic-gradient ring, the gloss
 * across the top of a card. Quotes, Trade Config, MetaTrader and Settings each
 * drifted into their own flat-grey dialect because there was nothing to import.
 *
 * Everything here is web-only styling (backdrop-filter, conic-gradient,
 * box-shadow) and must be spread behind a `Platform.OS === 'web'` guard, the
 * same way home does it.
 */
import { Platform } from 'react-native';
import type { CardShape } from '@/providers/theme-provider';

/** Home centres its column at this width; wider screens get letterboxed. */
export const CONTENT_MAX_WIDTH = 520;

/**
 * The accent wash behind the whole screen — strongest in the top-left corner,
 * gone by the middle of the page.
 */
export const screenWash = (accentRgb: string) =>
  'linear-gradient(135deg, rgba(' + accentRgb + ', 0.7) 0%, rgba(' + accentRgb +
  ', 0.3) 25%, rgba(0,0,0,0.85) 55%, #000 100%)';

/** The rotating border. Sits behind the card and is clipped to a thin rim. */
export const ring = (accent: string, accentRgb: string) =>
  'conic-gradient(from 0deg, transparent 0deg, ' + accent + ' 40deg, rgba(' + accentRgb +
  ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + accent + ' 220deg, rgba(' +
  accentRgb + ', 0.5) 260deg, transparent 300deg, transparent 360deg)';

/** The same ring, blurred, layered under it to bloom past the card edge. */
export const ringGlow = (accentRgb: string) =>
  'conic-gradient(from 0deg, transparent 0deg, rgba(' + accentRgb +
  ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + accentRgb +
  ', 0.4) 220deg, transparent 300deg, transparent 360deg)';

/**
 * Opaque card face. Near-black rather than translucent so text stays legible
 * over the page wash, with the accent spent on the outer bloom.
 */
export const cardSurface = (accentRgb: string) => ({
  // Long-form rather than the `background` shorthand: react-native-web logs
  // "Invalid style property" for the shorthand on every render.
  backgroundColor: '#0c0c0c',
  backdropFilter: 'blur(80px) saturate(200%)',
  WebkitBackdropFilter: 'blur(80px) saturate(200%)',
  boxShadow:
    'inset 0 2px 8px rgba(255,255,255,0.25), inset 0 -4px 12px rgba(0,0,0,0.4), ' +
    'inset 0 40px 60px -20px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6), ' +
    '0 0 30px rgba(' + accentRgb + ', 0.2), 0 0 80px rgba(' + accentRgb + ', 0.08)',
});

/**
 * Translucent panel face — for containers that should let the page wash
 * through: grouping blocks, inputs, the trading panel on home.
 */
export const panelSurface = (accentRgb: string) => ({
  backgroundColor: 'rgba(255,255,255,0.035)',
  backdropFilter: 'blur(80px) saturate(200%)',
  WebkitBackdropFilter: 'blur(80px) saturate(200%)',
  boxShadow:
    'inset 0 2px 8px rgba(255,255,255,0.25), inset 0 -4px 12px rgba(0,0,0,0.4), ' +
    'inset 0 40px 60px -20px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6), ' +
    '0 0 30px rgba(' + accentRgb + ', 0.2), 0 0 80px rgba(' + accentRgb + ', 0.08)',
});

/** Static accent bloom, for cards that shouldn't carry a spinning ring. */
export const staticGlow = (accentRgb: string) =>
  '0 0 4px rgba(' + accentRgb + ',0.5), 0 0 12px rgba(' + accentRgb +
  ',0.28), 0 0 30px rgba(' + accentRgb + ',0.12)';

/** Gloss laid over the top of a card, mimicking light on a curved surface. */
export const REFRACTION =
  'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 100%)';

/**
 * Radii per card shape. 'superpill' uses 999 so it clamps to half-height and
 * closes into a true capsule at any card size — a fixed radius reads as a
 * rounded rectangle on tall cards.
 */
export const radii = (shape: CardShape) => ({
  /** Tall cards — list rows, grouped blocks. */
  card: shape === 'superpill' ? 999 : shape === 'pill' ? 40 : 26,
  /** Short cards — single-line rows, buttons, inputs. */
  row: shape === 'superpill' ? 999 : shape === 'pill' ? 32 : 22,
});

/** Horizontal padding that keeps content clear of a capsule's curved ends. */
export const shapePadding = (shape: CardShape) =>
  shape === 'superpill' ? 26 : shape === 'pill' ? 22 : 18;

/** Muted text ladder, matched to home. */
export const INK = {
  primary: '#FFFFFF',
  secondary: 'rgba(255,255,255,0.45)',
  faint: 'rgba(255,255,255,0.35)',
  ghost: 'rgba(255,255,255,0.22)',
} as const;

/** Group caption — "THEME", "FONT", "SYMBOLS". */
export const GROUP_LABEL = {
  color: INK.faint,
  fontSize: 10,
  fontWeight: '600' as const,
  letterSpacing: 2,
};

/** Semantic colours, deliberately independent of the accent. */
export const SIGNAL = {
  buy: '#30D158',
  sell: '#FF453A',
  both: '#FFAA00',
  live: '#30D158',
  idle: 'rgba(255,255,255,0.35)',
} as const;

/** Spread onto a Pressable/Touchable so web gets a pointer + hover response. */
export const webPressable =
  Platform.OS === 'web'
    ? ({ cursor: 'pointer', transition: 'transform 0.15s ease, opacity 0.15s ease' } as any)
    : {};
