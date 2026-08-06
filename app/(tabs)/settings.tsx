import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, ThemeName, FontFamily, HeroStyle, TextCase, CardBgMode, CardShape } from '@/providers/theme-provider';
import { PageBackground } from '@/components/page-background';
import { useApp } from '@/providers/app-provider';
import { useSidebar } from '@/providers/sidebar-provider';
import { Menu } from 'lucide-react-native';
import { CONTENT_MAX_WIDTH, GROUP_LABEL, INK, radii, screenWash, shapePadding, webPressable } from '@/constants/neon';
import { NeonCard } from '@/components/neon-card';

const THEME_OPTIONS: { name: ThemeName; label: string; preview: string }[] = [
  { name: 'red', label: 'Red', preview: '#FF1A1A' },
  { name: 'blue', label: 'Blue', preview: '#1A8FFF' },
  { name: 'green', label: 'Green', preview: '#1AFF5E' },
  { name: 'purple', label: 'Purple', preview: '#A855F7' },
  { name: 'orange', label: 'Orange', preview: '#FF8C1A' },
  { name: 'cyan', label: 'Cyan', preview: '#06D6E0' },
];

export default function SettingsScreen() {
  const { themeName, theme, setThemeName, glassMode, setGlassMode, fontFamily, setFontFamily, heroStyle, setHeroStyle, textCase, setTextCase, cardBgMode, setCardBgMode, cardShape, setCardShape } = useTheme();
  const { eas } = useApp();
  const { toggle: toggleSidebar } = useSidebar();
  const primaryEA = eas.length > 0 ? eas[0] : null;
  const primaryEAImage = (() => {
    if (!primaryEA || !primaryEA.userData || !primaryEA.userData.owner) return null;
    const raw = (primaryEA.userData.owner.logo || '').toString().trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://tradeportea.com/admin/uploads/' + raw.replace(/^\/+/, '');
  })();

  const a = theme.accentRgb;
  const ac = theme.accent;
  const R = radii(cardShape);
  const padH = shapePadding(cardShape);

  /** A labelled group: caption outside, capsule card holding the controls. */
  const group = (label: string, body: React.ReactNode, caption?: string) => (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      <NeonCard radius={R.card} variant="glass" gloss={false} style={[styles.groupFace, { paddingHorizontal: padH }]} wrapperStyle={styles.groupWrap}>
        {caption && <Text style={styles.caption}>{caption}</Text>}
        {body}
      </NeonCard>
    </>
  );

  /**
   * Two-column pill picker. The accent is spent only on the chosen pill, so a
   * ten-option list still reads as one selection rather than ten buttons.
   */
  function segmented<T extends string>(options: T[], current: T, onSelect: (v: T) => void, labels: Record<T, string>) {
    return (
      <View style={styles.segmented}>
        {options.map((opt) => {
          const on = current === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.seg,
                webPressable,
                on && { backgroundColor: 'rgba(' + a + ', 0.14)', borderColor: 'rgba(' + a + ', 0.4)' },
                on && Platform.OS === 'web' && ({ boxShadow: '0 0 12px rgba(' + a + ', 0.25)' } as any),
              ]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segText, on && { color: ac, fontWeight: '700' }]}>{labels[opt]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && ({ backgroundImage: screenWash(a) } as any)]}>
      <PageBackground eaImage={primaryEAImage} />
      <ScrollView contentContainerStyle={styles.scrollOuter} showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <TouchableOpacity style={[styles.menuButton, webPressable]} onPress={toggleSidebar} activeOpacity={0.7}>
            <Menu color="rgba(255,255,255,0.8)" size={22} />
          </TouchableOpacity>

          <Text style={styles.header}>SETTINGS</Text>

          <Text style={styles.sectionLabel}>THEME</Text>
          <View style={styles.themeGrid}>
            {THEME_OPTIONS.map((opt) => {
              const on = themeName === opt.name;
              return (
                <NeonCard
                  key={opt.name}
                  radius={R.row}
                  /* The live theme is the one thing on this screen that's
                     "running", so it takes the spinning rim — in its own
                     colour, not the current accent. */
                  ring={on}
                  accent={{ color: opt.preview, rgb: hexToRgb(opt.preview) }}
                  onPress={() => setThemeName(opt.name)}
                  style={styles.themeFace}
                  wrapperStyle={styles.themeWrap}
                  gloss={false}
                >
                  <View style={[styles.previewSwatch, { backgroundColor: opt.preview + '20', borderColor: opt.preview + '55' }, Platform.OS === 'web' && ({ boxShadow: '0 0 14px ' + opt.preview + '66' } as any)]}>
                    <View style={[styles.previewDotInner, { backgroundColor: opt.preview }]} />
                  </View>
                  <Text style={[styles.themeLabel, on && { color: opt.preview, fontWeight: '700' }]}>{opt.label}</Text>
                </NeonCard>
              );
            })}
          </View>

          {group('GLASS STYLE',
            segmented<'neon' | 'sectioned'>(['neon', 'sectioned'], glassMode, setGlassMode, { neon: 'Neon', sectioned: 'Sections' }),
            glassMode === 'sectioned' ? 'Neon, grouped under section labels' : 'Neon glow with spinning borders',
          )}

          {group('FONT', segmented<FontFamily>(
            ['system', 'mono', 'rounded', 'condensed', 'serif', 'grotesk', 'jetbrains', 'outfit', 'sora', 'tight'],
            fontFamily, setFontFamily,
            { system: 'System', mono: 'Mono', rounded: 'Rounded', condensed: 'Condensed', serif: 'Serif', grotesk: 'Grotesk', jetbrains: 'JetBrains', outfit: 'Outfit', sora: 'Sora', tight: 'Tight' },
          ))}

          {group('HERO STYLE', segmented<HeroStyle>(
            ['square', 'circle'], heroStyle, setHeroStyle, { square: 'Square', circle: 'Circle' },
          ))}

          {group('CARD IMAGE', segmented<CardBgMode>(
            ['thumbnail', 'fullcover'], cardBgMode, setCardBgMode, { thumbnail: 'Thumbnail', fullcover: 'Full Cover' },
          ))}

          {group('CARD SHAPE', segmented<CardShape>(
            ['rounded', 'pill', 'superpill'], cardShape, setCardShape, { rounded: 'Rounded', pill: 'Pill', superpill: 'Super Pill' },
          ))}

          {group('TEXT CASE', segmented<TextCase>(
            ['normal', 'upper', 'lower', 'capitalize'], textCase, setTextCase,
            { normal: 'Normal', upper: 'UPPER', lower: 'lower', capitalize: 'Capitalize' },
          ))}

          <Text style={styles.sectionLabel}>ABOUT</Text>
          <NeonCard radius={R.row} variant="glass" gloss={false} style={[styles.aboutFace, { paddingHorizontal: padH }]} wrapperStyle={styles.groupWrap} onPress={() => {}}>
            <View style={[styles.cardIconContainer, { borderColor: 'rgba(' + a + ', 0.3)' }]}>
              <Text style={[styles.infoIcon, { color: ac }]}>i</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>About EA NAPTUNE</Text>
              <Text style={styles.cardSubtitle}>Version, license & support info</Text>
            </View>
          </NeonCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Theme swatches are stored as hex; the neon helpers want "r, g, b". */
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollOuter: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  column: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', zIndex: 10 },

  menuButton: {
    alignSelf: 'flex-start', marginBottom: 20,
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(60px) saturate(180%)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)',
    }),
  },
  header: { fontSize: 26, fontWeight: '800', color: INK.primary, marginBottom: 28, letterSpacing: 2 },
  sectionLabel: { ...GROUP_LABEL, marginBottom: 12, marginLeft: 16, marginTop: 20 },

  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  themeWrap: { width: '31.5%', marginBottom: 12 },
  themeFace: { paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center' },
  previewSwatch: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, zIndex: 5,
  },
  previewDotInner: { width: 16, height: 16, borderRadius: 8 },
  themeLabel: { fontSize: 12, fontWeight: '600', color: INK.secondary, letterSpacing: 0.3, zIndex: 5 },

  groupWrap: { marginBottom: 4 },
  groupFace: { paddingTop: 18, paddingBottom: 12 },
  caption: { fontSize: 12, color: INK.faint, marginBottom: 14, letterSpacing: 0.2, zIndex: 5 },

  segmented: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', zIndex: 5 },
  seg: {
    width: '48.5%', marginBottom: 8, paddingVertical: 12, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },
  segText: { fontSize: 12, fontWeight: '600', color: INK.secondary, letterSpacing: 0.3 },

  aboutFace: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  cardIconContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginRight: 14, zIndex: 5,
  },
  infoIcon: { fontSize: 18, fontWeight: '600', fontStyle: 'italic' },
  cardTextContainer: { flex: 1, zIndex: 5 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: INK.primary, letterSpacing: 0.3 },
  cardSubtitle: { fontSize: 12, color: INK.faint, marginTop: 3, letterSpacing: 0.2 },
});
