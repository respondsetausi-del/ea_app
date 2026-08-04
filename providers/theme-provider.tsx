import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeName = 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'cyan';
// minimal / liquid / commander / mech were retired — they fought the neon
// identity and every card style had to be written four times over.
export type GlassMode = 'neon' | 'sectioned';
export type FontFamily = 'system' | 'mono' | 'rounded' | 'condensed' | 'serif' | 'grotesk' | 'jetbrains' | 'outfit' | 'sora' | 'tight';
export type HeroStyle = 'square' | 'circle';
export type TextCase = 'normal' | 'upper' | 'lower' | 'capitalize';
export type BgType = 'robot' | 'video1' | 'video2' | 'video3' | 'video4' | 'custom' | 'off';
export type CardBgMode = 'thumbnail' | 'fullcover';
export type CardShape = 'rounded' | 'pill' | 'superpill';

const FONT_MAP: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
  mono: '"Fira Code", "SF Mono", "Courier New", monospace',
  rounded: '"Nunito", "SF Pro Rounded", system-ui, sans-serif',
  condensed: '"Roboto Condensed", "SF Pro Condensed", system-ui, sans-serif',
  serif: '"Playfair Display", "New York", "Georgia", serif',
  grotesk: '"Space Grotesk", system-ui, sans-serif',
  jetbrains: '"JetBrains Mono", monospace',
  outfit: '"Outfit", system-ui, sans-serif',
  sora: '"Sora", system-ui, sans-serif',
  tight: '"Inter Tight", system-ui, sans-serif',
};

const TEXT_CASE_MAP: Record<TextCase, string> = {
  normal: 'none', upper: 'uppercase', lower: 'lowercase', capitalize: 'capitalize',
};

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&family=Roboto+Condensed:wght@400;500;600;700;800&family=Playfair+Display:wght@400;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Sora:wght@400;500;600;700;800&family=Inter+Tight:wght@400;500;600;700;800;900&display=swap';

export interface ThemeColors {
  accent: string; accentRgb: string; accentLight: string; accentGlow: string; gradientStart: string; textMuted: string;
}

const THEMES: Record<ThemeName, ThemeColors> = {
  red: { accent: '#FF1A1A', accentRgb: '255, 26, 26', accentLight: '#FFB3B3', accentGlow: '#FF1A1A', gradientStart: 'rgba(255, 26, 26,', textMuted: 'rgba(255, 179, 179, 0.6)' },
  blue: { accent: '#0A84FF', accentRgb: '10, 132, 255', accentLight: '#B3D9FF', accentGlow: '#0A84FF', gradientStart: 'rgba(10, 132, 255,', textMuted: 'rgba(179, 217, 255, 0.6)' },
  green: { accent: '#1AFF5E', accentRgb: '26, 255, 94', accentLight: '#B3FFD0', accentGlow: '#1AFF5E', gradientStart: 'rgba(26, 255, 94,', textMuted: 'rgba(179, 255, 208, 0.6)' },
  purple: { accent: '#A855F7', accentRgb: '168, 85, 247', accentLight: '#DDB4FE', accentGlow: '#A855F7', gradientStart: 'rgba(168, 85, 247,', textMuted: 'rgba(221, 180, 254, 0.6)' },
  orange: { accent: '#FF8C1A', accentRgb: '255, 140, 26', accentLight: '#FFD1A3', accentGlow: '#FF8C1A', gradientStart: 'rgba(255, 140, 26,', textMuted: 'rgba(255, 209, 163, 0.6)' },
  cyan: { accent: '#06D6E0', accentRgb: '6, 214, 224', accentLight: '#A5F3FC', accentGlow: '#06D6E0', gradientStart: 'rgba(6, 214, 224,', textMuted: 'rgba(165, 243, 252, 0.6)' },
};

const THEME_STORAGE_KEY = 'ea_naptune_theme';
const GLASS_STORAGE_KEY = 'ea_naptune_glass_mode';
const FONT_STORAGE_KEY = 'ea_naptune_font';
const HERO_STORAGE_KEY = 'ea_naptune_hero_style';
const CASE_STORAGE_KEY = 'ea_naptune_text_case';
const BG_STORAGE_KEY = 'ea_naptune_bg_type';
const CARDBG_STORAGE_KEY = 'ea_naptune_card_bg';
const SHAPE_STORAGE_KEY = 'ea_naptune_card_shape';

export interface ThemeState {
  themeName: ThemeName; theme: ThemeColors; setThemeName: (name: ThemeName) => void;
  glassMode: GlassMode; setGlassMode: (mode: GlassMode) => void;
  fontFamily: FontFamily; fontFamilyCSS: string; setFontFamily: (f: FontFamily) => void;
  heroStyle: HeroStyle; setHeroStyle: (h: HeroStyle) => void;
  textCase: TextCase; textCaseCSS: string; setTextCase: (t: TextCase) => void;
  bgType: BgType; setBgType: (b: BgType) => void;
  cardBgMode: CardBgMode; setCardBgMode: (c: CardBgMode) => void;
  cardShape: CardShape; setCardShape: (s: CardShape) => void;
}

export const [ThemeProvider, useTheme] = createContextHook<ThemeState>(() => {
  const [themeName, setThemeNameState] = useState<ThemeName>('blue');
  const [glassMode, setGlassModeState] = useState<GlassMode>('neon');
  const [fontFamily, setFontFamilyState] = useState<FontFamily>('system');
  const [heroStyle, setHeroStyleState] = useState<HeroStyle>('circle');
  const [textCase, setTextCaseState] = useState<TextCase>('normal');
  const [bgType, setBgTypeState] = useState<BgType>('robot');
  const [cardBgMode, setCardBgModeState] = useState<CardBgMode>('thumbnail');
  // Superpill by default — the true capsule signed off on in the card-style
  // review. 'pill' is the softer rounded-rect step below it.
  const [cardShape, setCardShapeState] = useState<CardShape>('superpill');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((s) => { if (s && s in THEMES) setThemeNameState(s as ThemeName); }).catch(() => {});
    // Anyone still stored on a retired mode falls back to neon rather than
    // being left on a style the app no longer renders.
    AsyncStorage.getItem(GLASS_STORAGE_KEY).then((s) => {
      if (s === 'neon' || s === 'sectioned') setGlassModeState(s);
      else if (s) { setGlassModeState('neon'); AsyncStorage.setItem(GLASS_STORAGE_KEY, 'neon').catch(() => {}); }
    }).catch(() => {});
    AsyncStorage.getItem(FONT_STORAGE_KEY).then((s) => { if (s && s in FONT_MAP) setFontFamilyState(s as FontFamily); }).catch(() => {});
    AsyncStorage.getItem(HERO_STORAGE_KEY).then((s) => { if (s === 'square' || s === 'circle') setHeroStyleState(s); }).catch(() => {});
    AsyncStorage.getItem(CASE_STORAGE_KEY).then((s) => { if (s && s in TEXT_CASE_MAP) setTextCaseState(s as TextCase); }).catch(() => {});
    AsyncStorage.getItem(BG_STORAGE_KEY).then((s) => { if (s === 'robot' || s === 'video1' || s === 'video2' || s === 'video3' || s === 'video4' || s === 'custom' || s === 'off') setBgTypeState(s); }).catch(() => {});
    AsyncStorage.getItem(CARDBG_STORAGE_KEY).then((s) => { if (s === 'thumbnail' || s === 'fullcover') setCardBgModeState(s); }).catch(() => {});
    AsyncStorage.getItem(SHAPE_STORAGE_KEY).then((s) => { if (s === 'rounded' || s === 'pill' || s === 'superpill') setCardShapeState(s); }).catch(() => {});
  }, []);

  const setThemeName = useCallback((name: ThemeName) => { setThemeNameState(name); AsyncStorage.setItem(THEME_STORAGE_KEY, name).catch(() => {}); }, []);
  const setGlassMode = useCallback((mode: GlassMode) => { setGlassModeState(mode); AsyncStorage.setItem(GLASS_STORAGE_KEY, mode).catch(() => {}); }, []);
  const setFontFamily = useCallback((f: FontFamily) => { setFontFamilyState(f); AsyncStorage.setItem(FONT_STORAGE_KEY, f).catch(() => {}); }, []);
  const setHeroStyle = useCallback((h: HeroStyle) => { setHeroStyleState(h); AsyncStorage.setItem(HERO_STORAGE_KEY, h).catch(() => {}); }, []);
  const setTextCase = useCallback((t: TextCase) => { setTextCaseState(t); AsyncStorage.setItem(CASE_STORAGE_KEY, t).catch(() => {}); }, []);
  const setBgType = useCallback((b: BgType) => { setBgTypeState(b); AsyncStorage.setItem(BG_STORAGE_KEY, b).catch(() => {}); }, []);
  const setCardBgMode = useCallback((c: CardBgMode) => { setCardBgModeState(c); AsyncStorage.setItem(CARDBG_STORAGE_KEY, c).catch(() => {}); }, []);
  const setCardShape = useCallback((s: CardShape) => { setCardShapeState(s); AsyncStorage.setItem(SHAPE_STORAGE_KEY, s).catch(() => {}); }, []);

  const theme = THEMES[themeName];
  const fontFamilyCSS = FONT_MAP[fontFamily];
  const textCaseCSS = TEXT_CASE_MAP[textCase];

  return { themeName, theme, setThemeName, glassMode, setGlassMode, fontFamily, fontFamilyCSS, setFontFamily, heroStyle, setHeroStyle, textCase, textCaseCSS, setTextCase, bgType, setBgType, cardBgMode, setCardBgMode, cardShape, setCardShape };
});

export { THEMES, FONT_MAP, TEXT_CASE_MAP, GOOGLE_FONTS_URL };
