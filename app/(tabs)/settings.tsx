import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, ThemeName, FontFamily, HeroStyle, TextCase, BgType, CardBgMode, CardShape } from '@/providers/theme-provider';
import { PageBackground } from '@/components/page-background';
import { useApp } from '@/providers/app-provider';
import { useSidebar } from '@/providers/sidebar-provider';
import { Menu } from 'lucide-react-native';

const THEME_OPTIONS: { name: ThemeName; label: string; preview: string }[] = [
  { name: 'red', label: 'Red', preview: '#FF1A1A' },
  { name: 'blue', label: 'Blue', preview: '#1A8FFF' },
  { name: 'green', label: 'Green', preview: '#1AFF5E' },
  { name: 'purple', label: 'Purple', preview: '#A855F7' },
  { name: 'orange', label: 'Orange', preview: '#FF8C1A' },
  { name: 'cyan', label: 'Cyan', preview: '#06D6E0' },
];

export default function SettingsScreen() {
  const { themeName, theme, setThemeName, glassMode, setGlassMode, fontFamily, setFontFamily, heroStyle, setHeroStyle, textCase, setTextCase, bgType, setBgType, cardBgMode, setCardBgMode, cardShape, setCardShape } = useTheme();
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
  const isNeon = glassMode === 'neon';
  const isLiquid = glassMode === 'liquid';
  const isCmd = glassMode === 'commander';

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { backgroundImage: isNeon ? 'linear-gradient(135deg, rgba(' + theme.accentRgb + ', 0.7) 0%, rgba(' + theme.accentRgb + ', 0.3) 25%, rgba(0,0,0,0.85) 55%, #000 100%)' : isLiquid ? 'linear-gradient(160deg, #1a1a1e 0%, #111113 40%, #0a0a0c 100%)' : 'none' }]}>
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
                  isActive && { shadowColor: opt.preview, shadowOpacity: 0.5, shadowRadius: 12 },
                  isActive && Platform.OS === 'web' && { boxShadow: '0 0 14px ' + opt.preview + '55, 0 0 28px ' + opt.preview + '22' },
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
            {glassMode === 'neon' ? 'Neon glow with spinning borders' : glassMode === 'minimal' ? 'Dark glass with accent aura' : glassMode === 'liquid' ? 'Frosted translucent iOS glass' : glassMode === 'mech' ? 'Robot background with voice circle' : 'Commander with robot background'}
          </Text>
          <View style={styles.glassSegmented}>
            {(['neon', 'minimal', 'liquid', 'commander', 'mech'] as const).map((m) => {
              const active = glassMode === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.glassSeg, active && styles.glassSegActive, active && { borderColor: theme.accent + '55' }, active && Platform.OS === 'web' && { boxShadow: '0 0 10px ' + theme.accent + '22' }]}
                  onPress={() => setGlassMode(m)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{m === 'neon' ? 'Neon' : m === 'minimal' ? 'Minimal' : m === 'liquid' ? 'Liquid' : m === 'mech' ? 'Mech' : 'Commander'}</Text>
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
                  style={[styles.glassSeg, active && styles.glassSegActive, active && { borderColor: theme.accent + '55' }]}
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
                <TouchableOpacity key={h} style={[styles.glassSeg, active && styles.glassSegActive, active && { borderColor: theme.accent + '55' }]} onPress={() => setHeroStyle(h)} activeOpacity={0.7}>
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
                <TouchableOpacity key={c} style={[styles.glassSeg, active && styles.glassSegActive, active && { borderColor: theme.accent + '55' }]} onPress={() => setCardBgMode(c)} activeOpacity={0.7}>
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
                <TouchableOpacity key={s} style={[styles.glassSeg, active && styles.glassSegActive, active && { borderColor: theme.accent + '55' }]} onPress={() => setCardShape(s)} activeOpacity={0.7}>
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
                <TouchableOpacity key={t} style={[styles.glassSeg, active && styles.glassSegActive, active && { borderColor: theme.accent + '55' }]} onPress={() => setTextCase(t)} activeOpacity={0.7}>
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{labels[t]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 32 }]}>BACKGROUND</Text>
        <View style={[styles.glassCard, { borderColor: 'rgba(' + theme.accentRgb + ', 0.2)' }]}>
          <Text style={[styles.cardSubtitle, { marginBottom: 14 }]}>
            {bgType === 'robot' ? 'EA robot image' : bgType === 'off' ? 'Background disabled' : bgType === 'custom' ? 'Your uploaded video' : 'Video ' + bgType.replace('video', '')}
          </Text>
          <View style={styles.glassSegmented}>
            {(['robot', 'video1', 'video2', 'video3', 'video4', 'off'] as BgType[]).map((b) => {
              const active = bgType === b;
              const labels: Record<string, string> = { robot: '🤖 Robot', video1: '🎬 V1', video2: '🎬 V2', video3: '🎬 V3', video4: '🎬 V4', off: '⬛ Off' };
              return (
                <TouchableOpacity key={b} style={[styles.glassSeg, active && styles.glassSegActive, active && { borderColor: theme.accent + '55' }]} onPress={() => setBgType(b)} activeOpacity={0.7}>
                  <Text style={[styles.glassSegText, active && { color: theme.accent }]}>{labels[b]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={[styles.glassSeg, bgType === 'custom' && styles.glassSegActive, bgType === 'custom' && { borderColor: theme.accent + '55' }, { marginTop: 8, width: '100%' }]}
              onPress={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/mp4,video/webm,video/ogg,video/*';
                input.onchange = (e: any) => {
                  const file = e.target?.files?.[0];
                  if (!file) { console.log('No file selected'); return; }
                  console.log('Video selected:', file.name, file.type, (file.size / 1024 / 1024).toFixed(1) + 'MB');
                  const url = URL.createObjectURL(file);
                  console.log('Blob URL created:', url);
                  (window as any).__tradeport_custom_video_url = url;
                  // Persist to IndexedDB
                  try {
                    const req = indexedDB.open('tradeport_videos', 2);
                    req.onupgradeneeded = (ev: any) => {
                      const db = ev.target.result;
                      if (!db.objectStoreNames.contains('videos')) db.createObjectStore('videos');
                    };
                    req.onsuccess = (ev: any) => {
                      try {
                        const db = ev.target.result;
                        const tx = db.transaction('videos', 'readwrite');
                        tx.objectStore('videos').put(file, 'custom_bg');
                        tx.oncomplete = () => console.log('Video saved to IndexedDB');
                        tx.onerror = (err: any) => console.log('IndexedDB tx error:', err);
                      } catch (err) { console.log('IndexedDB save error:', err); }
                    };
                    req.onerror = (err: any) => console.log('IndexedDB open error:', err);
                  } catch (err) { console.log('IndexedDB init error:', err); }
                  // Force bgType off then custom to guarantee re-render
                  setBgType('off');
                  setTimeout(() => {
                    setBgType('custom');
                    window.dispatchEvent(new CustomEvent('tradeport-custom-video', { detail: { url } }));
                  }, 50);
                };
                input.click();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.glassSegText, bgType === 'custom' && { color: theme.accent }]}>📁 Upload Your Video</Text>
            </TouchableOpacity>
          )}
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
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.12)',
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomColor: 'rgba(0, 0, 0, 0.15)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(60px) saturate(180%)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)',
    }),
  },
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
    marginBottom: 14,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  themeCard: {
    width: '31%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
    }),
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
    color: 'rgba(255, 255, 255, 0.5)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(40px)',
      WebkitBackdropFilter: 'blur(40px)',
    }),
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
    color: 'rgba(255, 255, 255, 0.4)',
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
    marginBottom: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  glassSegActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassSegText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.3,
  },
});
