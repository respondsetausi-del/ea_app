import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, ThemeName, FontFamily, HeroStyle, TextCase, CardBgMode, CardShape } from '@/providers/theme-provider';
import { PageBackground } from '@/components/page-background';
import { useApp } from '@/providers/app-provider';
import { useSidebar } from '@/providers/sidebar-provider';
import { Menu } from 'lucide-react-native';
import { SURFACE, TEXT, RADIUS, GROUP_LABEL, activeTint } from '@/constants/surface';

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
  const isNeon = glassMode === 'neon' || glassMode === 'sectioned';
  const isLiquid = false;
  const isCmd = false;

  return (
    <SafeAreaView style={styles.container}>
      <PageBackground eaImage={primaryEAImage} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar} activeOpacity={0.7}>
          <Menu color="rgba(255,255,255,0.8)" size={22} />
        </TouchableOpacity>

        <Text style={styles.header}>Settings</Text>

        <Text style={styles.sectionLabel}>THEME</Text>
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map((opt) => {
            const isActive = themeName === opt.name;
            return (
              <TouchableOpacity
                key={opt.name}
                style={[
                  styles.themeCard,
                  { borderColor: isActive ? opt.preview : 'rgba(255, 255, 255, 0.08)' },
                  
                ]}
                activeOpacity={0.7}
                onPress={() => setThemeName(opt.name)}
              >
                <View style={[styles.previewSwatch, { backgroundColor: opt.preview + '20', borderColor: opt.preview + '44' }]}>
                  <View style={[styles.previewDotInner, { backgroundColor: opt.preview }]} />
                </View>
                <Text style={[styles.themeLabel, isActive && { color: opt.preview }]}>{opt.label}</Text>
                {isActive && (
                  <View style={[styles.activeDot, { backgroundColor: opt.preview }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>GLASS STYLE</Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
          <Text style={[styles.cardSubtitle, { marginBottom: 14 }]}>
            {glassMode === 'sectioned' ? 'Neon, grouped under section labels' : 'Neon glow with spinning borders'}
          </Text>
          <View style={styles.glassSegmented}>
            {(['neon', 'sectioned'] as const).map((m) => {
              const active = glassMode === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.glassSeg, active && styles.glassSegActive, active && activeTint(theme.accentRgb)]}
                  onPress={() => setGlassMode(m)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{m === 'neon' ? 'Neon' : 'Sections'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>FONT</Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
          <View style={styles.glassSegmented}>
            {(['system', 'mono', 'rounded', 'condensed', 'serif', 'grotesk', 'jetbrains', 'outfit', 'sora', 'tight'] as FontFamily[]).map((f) => {
              const active = fontFamily === f;
              const labels: Record<FontFamily, string> = { system: 'System', mono: 'Mono', rounded: 'Rounded', condensed: 'Condensed', serif: 'Serif', grotesk: 'Grotesk', jetbrains: 'JetBrains', outfit: 'Outfit', sora: 'Sora', tight: 'Tight' };
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.glassSeg, active && styles.glassSegActive, active && activeTint(theme.accentRgb)]}
                  onPress={() => setFontFamily(f)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{labels[f]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>HERO STYLE</Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
          <View style={styles.glassSegmented}>
            {(['square', 'circle'] as HeroStyle[]).map((h) => {
              const active = heroStyle === h;
              return (
                <TouchableOpacity key={h} style={[styles.glassSeg, active && styles.glassSegActive, active && activeTint(theme.accentRgb)]} onPress={() => setHeroStyle(h)} activeOpacity={0.7}>
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{h === 'square' ? 'Square' : 'Circle'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>CARD IMAGE</Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
          <View style={styles.glassSegmented}>
            {(['thumbnail', 'fullcover'] as CardBgMode[]).map((c) => {
              const active = cardBgMode === c;
              const labels: Record<CardBgMode, string> = { thumbnail: 'Thumbnail', fullcover: 'Full Cover' };
              return (
                <TouchableOpacity key={c} style={[styles.glassSeg, active && styles.glassSegActive, active && activeTint(theme.accentRgb)]} onPress={() => setCardBgMode(c)} activeOpacity={0.7}>
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{labels[c]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>CARD SHAPE</Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
          <View style={styles.glassSegmented}>
            {(['rounded', 'pill', 'superpill'] as CardShape[]).map((s) => {
              const active = cardShape === s;
              const labels: Record<CardShape, string> = { rounded: 'Rounded', pill: 'Pill', superpill: 'Super Pill' };
              return (
                <TouchableOpacity key={s} style={[styles.glassSeg, active && styles.glassSegActive, active && activeTint(theme.accentRgb)]} onPress={() => setCardShape(s)} activeOpacity={0.7}>
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{labels[s]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>TEXT CASE</Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
          <View style={styles.glassSegmented}>
            {(['normal', 'upper', 'lower', 'capitalize'] as TextCase[]).map((t) => {
              const active = textCase === t;
              const labels: Record<TextCase, string> = { normal: 'Normal', upper: 'UPPER', lower: 'lower', capitalize: 'Capitalize' };
              return (
                <TouchableOpacity key={t} style={[styles.glassSeg, active && styles.glassSegActive, active && activeTint(theme.accentRgb)]} onPress={() => setTextCase(t)} activeOpacity={0.7}>
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{labels[t]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>


        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>ABOUT</Text>
        <TouchableOpacity
          style={[styles.glassCard, { flexDirection: 'row', alignItems: 'center', borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIconContainer, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
            <Text style={[styles.infoIcon, { color: theme.accent }]}>i</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>About EA NAPTUNE</Text>
            <Text style={styles.cardSubtitle}>Version, license & support info</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    backgroundColor: SURFACE.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SURFACE.hairline,
  },
  container: {
    flex: 1,
    backgroundColor: SURFACE.ground,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT.primary,
    marginBottom: 28,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    ...GROUP_LABEL,
    marginBottom: 10,
    marginLeft: 6,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '31%',
    backgroundColor: SURFACE.card,
    borderRadius: RADIUS.card,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SURFACE.hairline,
  },
  previewSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewDotInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.muted,
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  glassCard: {
    flexDirection: 'column',
    backgroundColor: SURFACE.card,
    borderRadius: RADIUS.card,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoIcon: {
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: TEXT.faint,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  glassSegmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  glassSeg: {
    width: '47%',
    marginRight: '3%',
    marginBottom: 8,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: SURFACE.control,
    borderWidth: 1,
    borderColor: SURFACE.hairline,
    alignItems: 'center',
  },
  glassSegActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  glassSegText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT.muted,
    letterSpacing: 0.3,
  },
});
