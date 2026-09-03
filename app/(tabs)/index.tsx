import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ImageBackground, Platform, Dimensions, SafeAreaView, Animated, RefreshControl, Modal } from 'react-native';
import { Play, Square, TrendingUp, Trash2, Plus, Menu, BarChart3, Shield } from 'lucide-react-native';
import { router } from 'expo-router';
import { RobotLogo } from '@/components/robot-logo';
import { CandleLogo } from '@/components/candle-logo';
import { PageBackground } from '@/components/page-background';
import QuickConfigModal, { QuickConfig } from '@/components/quick-config-modal';
import { NeonModal, NeonModalButton } from '@/components/neon-modal';
import { apiService } from '@/services/api';
import { buildStrategyParams } from '@/utils/strategy-sync';

import { useApp } from '@/providers/app-provider';
import { useTheme } from '@/providers/theme-provider';
import { useSidebar } from '@/providers/sidebar-provider';
import type { EA } from '@/providers/app-provider';

export default function HomeScreen() {
  const { eas, isFirstTime, setIsFirstTime, removeEA, isBotActive, setBotActive, setBotStarting, setActiveEA, user, mt5Account, mt4Account, activateMT5Symbol, deactivateMT5Symbol, mt5Symbols, ensureMT5Connected } = useApp();
  const [scannerGateMsg, setScannerGateMsg] = useState<string | null>(null);
  const [quickStartOpen, setQuickStartOpen] = useState<boolean>(false);

  // START → quick-config popup (every time) → confirm → save symbol, execute
  // instantly and begin the 10-minute flip loop. STOP → close + halt.
  const handleQuickStartConfirm = useCallback(async (cfg: QuickConfig) => {
    setQuickStartOpen(false);
    const symbol = cfg.symbol.trim();
    const lot = parseFloat(String(cfg.lotSize).replace(',', '.')) || 0.01;
    const count = Math.max(1, Math.min(100, parseInt(cfg.numberOfTrades, 10) || 1));
    let uuid = mt5Account?.uuid;
    if (!symbol || !uuid) return;

    // The popup's symbol joins the ones already selected in Trade Config
    // rather than replacing them — the run trades every selected symbol.
    try { activateMT5Symbol({ symbol, lotSize: String(lot), numberOfTrades: String(count), direction: 'BOTH' }); } catch {}

    // Built from the SAME helper Trade Config uses, so there is exactly one
    // definition of "the symbols this account trades". This screen used to
    // assemble its own list and per-symbol sizing inline, which is how the two
    // paths could disagree about what was selected.
    const next = [
      ...(mt5Symbols || []).filter((m) => m.symbol !== symbol),
      { symbol, lotSize: String(lot), numberOfTrades: String(count) },
    ];
    const params = buildStrategyParams(next, lot, count, eas?.[0]?.name || 'Robot');
    if (!params) return;

    setBotActive(true);
    // Verify the broker still holds this session (and silently reconnect if not)
    // before handing the UUID to the server-side strategy engine.
    const fresh = await ensureMT5Connected();
    if (fresh) uuid = fresh;
    try {
      await apiService.startStrategy(uuid, params);
    } catch (e: any) {
      console.error('[quickstart] startStrategy error:', e?.message || e);
    }
  }, [mt5Account?.uuid, mt5Symbols, activateMT5Symbol, setBotActive, eas, ensureMT5Connected]);

  const handleToggleBot = useCallback(async () => {
    if (isBotActive) {
      setBotStarting(false);
      setBotActive(false);
      const uuid = mt5Account?.uuid;
      if (uuid) { try { await apiService.stopStrategy(uuid); } catch (e: any) { console.error('[stop] stopStrategy error:', e?.message || e); } }
      return;
    }
    // Raise the island on the tap. Every path below either takes the start
    // forward or clears this again, so it can't be left hanging.
    setBotStarting(true);
    if (!mt5Account?.uuid) { setBotStarting(false); setScannerGateMsg('Connect your MT5 account before starting.'); return; }
    // Stored connected flag is not proof the broker still holds the session —
    // probe/reconnect once, and only block if the reconnect genuinely fails.
    if (!mt5Account?.connected) {
      const fresh = await ensureMT5Connected();
      if (!fresh) { setBotStarting(false); setScannerGateMsg('Connect your MT5 account before starting.'); return; }
    }
    setQuickStartOpen(true); // always show the popup on start
  }, [isBotActive, mt5Account?.uuid, mt5Account?.connected, setBotActive, setBotStarting, ensureMT5Connected]);

  // Scanner requires a connected MT4 or MT5 account. If neither is connected,
  // show the SETUP REQUIRED popup instead of opening the scanner.
  const tryScannerOpen = useCallback(() => {
    const mt5Connected = !!(mt5Account?.login && mt5Account?.password && mt5Account?.server && mt5Account?.connected);
    const mt4Connected = !!(mt4Account?.login && mt4Account?.password && mt4Account?.server && (mt4Account as any)?.connected);
    if (!mt5Connected && !mt4Connected) {
      setScannerGateMsg('Connect your trading account to access the scanner.');
      return;
    }
    router.push('/(tabs)/scanner');
  }, [mt5Account, mt4Account]);
  const { theme, glassMode, heroStyle, cardBgMode, cardShape } = useTheme();
  const { toggle: toggleSidebar } = useSidebar();
  // 'sectioned' keeps the neon surfaces and spinning borders and only changes
  // how the screen is grouped, so it reuses every isNeon styling branch rather
  // than duplicating them.
  const isSectioned = glassMode === 'sectioned';
  const isNeon = glassMode === 'neon' || isSectioned;
  // Retired styles. Kept as constants so the (now unreachable) style branches
  // below still compile; they can be stripped out in a follow-up pass.
  const isLiquid = false;
  const isCmd = false;
  const isPill = false;
  const isMech = false;
  const isMinimal = false;
  // Shape-aware border radius
  const effShape = isPill ? 'superpill' : cardShape;
  // 'superpill' is a true capsule: the radius has to exceed half the card's
  // height to close the curve, so a fixed 40 on an ~80px card still read as a
  // rounded rectangle. 999 clamps to half-height at any size.
  const shapeR = effShape === 'superpill' ? 999 : effShape === 'pill' ? 40 : 26;
  const shapeRInfo = effShape === 'superpill' ? 999 : effShape === 'pill' ? 32 : 22;
  const shapeRAdd = effShape === 'superpill' ? 999 : effShape === 'pill' ? 32 : 22;
  const shapePadH = effShape === 'superpill' ? 24 : effShape === 'pill' ? 20 : 16;
  const shapeWidth = isPill ? '92%' as any : '100%' as any;
  const cmdRed = theme.accent;
  const cmdRedRgb = theme.accentRgb;

  // Spinning neon border animations
  const cardSpin = useRef(new Animated.Value(0)).current;
  const tradeSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cardLoop = Animated.loop(
      Animated.timing(cardSpin, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      })
    );
    const tradeLoop = Animated.loop(
      Animated.timing(tradeSpin, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: Platform.OS !== 'web',
        isInteraction: false,
      })
    );
    cardLoop.start();
    tradeLoop.start();
    return () => { cardLoop.stop(); tradeLoop.stop(); };
  }, []);

  const cardSpinDeg = cardSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const tradeSpinDeg = tradeSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const a = theme.accentRgb;
  const ac = theme.accent;
  const ag = theme.accentGlow;
  // Commander overrides accent colors
  const ca = isCmd ? cmdRedRgb : a;
  const cc = isCmd ? cmdRed : ac;

  const primaryEA = Array.isArray(eas) && eas.length > 0 ? eas[0] : null;
  const otherEAs = Array.isArray(eas) ? eas.slice(1) : [];

  console.log('HomeScreen render - EAs count:', eas?.length || 0, 'Primary EA:', primaryEA?.name || 'none');

  const [logoError, setLogoError] = useState<boolean>(false);
  const [showRemoveWarning, setShowRemoveWarning] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (!isFirstTime) {
      if (!user) {
        console.log('Navigation guard: No user data found, redirecting to login');
        router.replace('/login');
      } else if (eas.length === 0) {
        console.log('Navigation guard: User authenticated but no EAs found, redirecting to license');
        router.replace('/license');
      }
    }
  }, [isFirstTime, user, eas.length]);

  const getEAImageUrl = useCallback((ea: EA | null): string | null => {
    if (!ea || !ea.userData || !ea.userData.owner) {
      console.log('EA Image Debug: Missing EA data or owner');
      return null;
    }
    const raw = (ea.userData.owner.logo || '').toString().trim();
    if (!raw) {
      console.log('EA Image Debug: No logo found for EA:', ea.name);
      return null;
    }
    if (/^https?:\/\//i.test(raw)) {
      console.log('EA Image Debug: Using absolute URL:', raw);
      return raw;
    }
    const filename = raw.replace(/^\/+/, '');
    const base = 'https://tradeportea.com/admin/uploads';
    const fullUrl = `${base}/${filename}`;
    console.log('EA Image Debug: Constructed URL:', fullUrl, 'from filename:', filename);
    return fullUrl;
  }, []);

  const primaryEAImage = useMemo(() => getEAImageUrl(primaryEA), [getEAImageUrl, primaryEA]);

  const handleStartNow = () => {
    console.log('Start Now pressed, navigating to login...');
    try {
      setIsFirstTime(false);
      router.push('/login');
    } catch (error) {
      console.error('Error navigating to login:', error);
    }
  };

  const handleAddNewEA = () => {
    router.push('/license');
  };

  const handleRemoveActiveBot = () => {
    setShowRemoveWarning(true);
  };

  const confirmRemoveBot = async () => {
    setShowRemoveWarning(false);
    if (primaryEA && primaryEA.id) {
      try {
        const success = await removeEA(primaryEA.id);
        if (success) router.push('/license');
      } catch (error) { console.error('Error removing EA:', error); }
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setIsRefreshing(false);
  };

  const handleQuotes = () => {
    router.push('/(tabs)/quotes');
  };

  /* ============================================================
     BUBBLE HELPER
     ============================================================ */
  const renderBubbles = (layout: Array<{t: string; l: string; s: number; o?: number}>) => (
    <View style={styles.bubblesContainer} pointerEvents="none">
      {layout.map((b, i) => (
        <View
          key={i}
          style={[
            styles.bubble,
            { top: b.t, left: b.l, width: b.s, height: b.s, borderRadius: b.s / 2, opacity: b.o ?? 1 },
            Platform.OS === 'web' && { background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.04) 60%, transparent 70%)' },
          ]}
        />
      ))}
    </View>
  );

  const heroBubbles = [
    { t: '8%', l: '78%', s: 20 },
    { t: '14%', l: '88%', s: 14 },
    { t: '5%', l: '85%', s: 9 },
    { t: '12%', l: '68%', s: 16 },
    { t: '20%', l: '75%', s: 7 },
    { t: '6%', l: '60%', s: 11 },
  ];

  const cardBubbles = [
    { t: '10%', l: '75%', s: 16 },
    { t: '18%', l: '85%', s: 11 },
    { t: '6%', l: '82%', s: 7 },
    { t: '14%', l: '65%', s: 13 },
    { t: '24%', l: '72%', s: 5 },
    { t: '8%', l: '58%', s: 9 },
    { t: '28%', l: '80%', s: 4 },
    { t: '16%', l: '50%', s: 14, o: 0.5 },
  ];

  const pillBubbles = [
    { t: '15%', l: '80%', s: 12 },
    { t: '30%', l: '70%', s: 8 },
    { t: '10%', l: '88%', s: 6 },
    { t: '40%', l: '75%', s: 10, o: 0.5 },
  ];

  // Show splash screen for first-time users
  if (isFirstTime) {
    return (
      <View style={[styles.splashContainer, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(135deg, rgba(' + a + ', 0.95) 0%, rgba(' + a + ', 0.7) 20%, rgba(' + a + ', 0.4) 40%, rgba(' + a + ', 0.2) 60%, rgba(' + a + ', 0.1) 80%, rgba(0, 0, 0, 0.8) 95%, rgba(0, 0, 0, 1) 100%)' }]}>
        <View style={styles.splashContent}>
          <View style={styles.logoContainer}>
            <View
              testID="splash-app-icon"
              style={[
                { width: 120, height: 120, borderRadius: 24, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' },
                Platform.OS === 'web' && { boxShadow: '0 0 26px rgba(' + a + ', 0.55)' },
              ]}
            >
              <CandleLogo size={84} color={ac} />
            </View>
            <Text style={[styles.title, { color: ac }]}>EA NAPTUNE</Text>
          </View>
          <Text style={styles.description}>
            Run your Expert Advisors 24/7 without leaving a PC on. Monitor, tune, and manage every EA from your phone.
          </Text>
          <TouchableOpacity style={[styles.splashStartButton, { borderColor: ac, shadowColor: ac }]} onPress={handleStartNow}>
            <Text style={[styles.startButtonText, { color: ac }]}>START NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { backgroundImage: isNeon ? 'linear-gradient(135deg, rgba(' + a + ', 0.7) 0%, rgba(' + a + ', 0.3) 25%, rgba(0,0,0,0.85) 55%, #000 100%)' : isLiquid ? 'linear-gradient(160deg, #1a1a1e 0%, #111113 40%, #0a0a0c 100%)' : isCmd ? 'none' : 'none' }]}>
      {/* Background — robot image or video */}
      <PageBackground eaImage={primaryEAImage} />
      {/* Menu Button */}
      <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar} activeOpacity={0.7}>
        <Menu color="rgba(255,255,255,0.8)" size={22} />
      </TouchableOpacity>

      {/* Capped to a phone-width column. The neon spinner behind each card is
          sized relative to that card, so a full-width desktop card turns one
          wedge of the cone into a solid wash instead of a travelling edge. */}
      <ScrollView style={styles.content} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={ac} colors={[ac]} />}>

        {/* ========== MECH LAYOUT — completely different layout ========== */}
        {isMech && primaryEA && (
          <View style={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 80, alignItems: 'center' }}>
            {/* Hero circle */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={[{ width: 130, height: 130, borderRadius: 65, overflow: 'hidden', padding: 3, position: 'relative' }, Platform.OS === 'web' && { boxShadow: '0 0 4px rgba(' + a + ',0.8), 0 0 15px rgba(' + a + ',0.5), 0 0 40px rgba(' + a + ',0.25)' } as any]}>
                <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 65, transform: [{ rotate: tradeSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent, ' + cc + ' 80deg, rgba(' + ca + ', 0.3) 160deg, transparent 200deg, transparent 260deg, ' + cc + ' 340deg, transparent)' } as any]} />
                {primaryEAImage && !logoError ? (
                  <Image source={{ uri: primaryEAImage }} style={{ width: '100%', height: '100%', borderRadius: 63 }} resizeMode="cover" />
                ) : (
                  <Image source={require('../../assets/images/icon.png')} style={{ width: '100%', height: '100%', borderRadius: 63 }} resizeMode="contain" />
                )}
              </View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 10 }}>{primaryEA.name}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 3, textAlign: 'center' }}>Your Shadow Soldier Is Ready.</Text>
            </View>

            {/* Powered By */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[{ paddingVertical: 5, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.4)' }, Platform.OS === 'web' && { backdropFilter: 'blur(10px)' } as any]}>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Powered By <Text style={{ fontWeight: '700', color: cc }}>EA NAPTUNE</Text></Text>
              </View>
            </View>

            {/* Split: Buttons left + Voice mic right */}
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              {/* Left buttons */}
              <View style={{ flex: 1, gap: 12, maxWidth: 220 }}>
                <TouchableOpacity onPress={handleQuotes} activeOpacity={0.6} style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'rgba(' + ca + ',0.5)' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)', boxShadow: '0 0 4px rgba(' + ca + ',0.7), 0 0 10px rgba(' + ca + ',0.4), 0 0 25px rgba(' + ca + ',0.2)', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' } as any]}>
                  <TrendingUp color={'rgba(255,255,255,0.45)'} size={14} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: cc }}>Quotes</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleToggleBot} activeOpacity={0.6} style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'rgba(' + ca + ',0.5)' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)', boxShadow: '0 0 4px rgba(' + ca + ',0.7), 0 0 10px rgba(' + ca + ',0.4), 0 0 25px rgba(' + ca + ',0.2)', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' } as any]}>
                  {isBotActive ? <Square color={cc} size={14} fill={cc} /> : <Play color={cc} size={14} fill={cc} />}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: cc }}>{isBotActive ? 'Stop' : 'Start'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRemoveActiveBot} activeOpacity={0.6} style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'rgba(' + ca + ',0.5)' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)', boxShadow: '0 0 4px rgba(' + ca + ',0.7), 0 0 10px rgba(' + ca + ',0.4), 0 0 25px rgba(' + ca + ',0.2)', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' } as any]}>
                  <Trash2 color={cc} size={14} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: cc }}>Remove</Text>
                </TouchableOpacity>
              </View>

              {/* Voice mic — tappable, triggers Dynamic Island voice */}
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity onPress={() => { if (Platform.OS === 'web' && (window as any).__ea_naptune_toggleVoice) { (window as any).__ea_naptune_toggleVoice(); } }} activeOpacity={0.6} style={[{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(' + ca + ',0.3)', backgroundColor: 'rgba(0,0,0,0.5)' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)', boxShadow: '0 0 4px rgba(' + ca + ',0.6), 0 0 12px rgba(' + ca + ',0.3), 0 0 30px rgba(' + ca + ',0.15)', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' } as any]}>
                  <Text style={{ fontSize: 20 }}>🎤</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Robot info card */}
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'rgba(' + ca + ',0.4)', marginBottom: 10, maxWidth: 280, width: '100%' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)', boxShadow: '0 0 4px rgba(' + ca + ',0.7), 0 0 10px rgba(' + ca + ',0.4), 0 0 25px rgba(' + ca + ',0.2)' } as any]}>
              <View style={{ width: 36, height: 36, borderRadius: 11, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' }}>
                {primaryEAImage && !logoError ? (
                  <Image source={{ uri: primaryEAImage }} style={{ width: 36, height: 36 }} resizeMode="cover" />
                ) : (
                  <Image source={require('../../assets/images/icon.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
                )}
              </View>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{primaryEA.name}</Text>
                <Text style={{ fontSize: 7, fontWeight: '600', letterSpacing: 0.6, color: isBotActive ? '#16A34A' : 'rgba(255,255,255,0.4)' }}>{isBotActive ? 'RUNNING' : 'IDLE'}</Text>
              </View>
            </View>

            {/* Add a New EA */}
            <TouchableOpacity onPress={handleAddNewEA} activeOpacity={0.6} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 2, borderColor: 'rgba(' + ca + ',0.3)', maxWidth: 280, width: '100%' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)', boxShadow: '0 0 4px rgba(' + ca + ',0.7), 0 0 10px rgba(' + ca + ',0.4), 0 0 25px rgba(' + ca + ',0.2)', cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s' } as any]}>
              <Plus color={cc} size={14} />
              <View>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>ADD A NEW EA</Text>
                <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>HAVE A VALID LICENSE KEY</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ========== STANDARD LAYOUT (all other themes) ========== */}
        {!isMech && primaryEA && (
          <View style={styles.mainEAContainer}>

            {/* ========== 1. HERO — CIRCLE or SQUARE ========== */}
            {heroStyle === 'circle' ? (
              <View style={styles.cmdHero}>
                <View style={[styles.cmdPortrait, Platform.OS === 'web' && { boxShadow: '0 0 20px rgba(' + ca + ', 0.4), 0 0 40px rgba(' + ca + ', 0.2)' }]}>
                  <Animated.View style={[styles.cmdRing, { transform: [{ rotate: tradeSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent, ' + cc + ' 80deg, rgba(' + ca + ', 0.3) 160deg, transparent 200deg, transparent 260deg, ' + cc + ' 340deg, transparent 360deg)' }]} />
                  {primaryEAImage && !logoError ? (
                    <Image source={{ uri: primaryEAImage }} style={styles.cmdPortraitImg} resizeMode="cover" />
                  ) : (
                    <Image source={require('../../assets/images/icon.png')} style={styles.cmdPortraitImg} resizeMode="contain" />
                  )}
                </View>
                <Text style={styles.cmdName}>{primaryEA.name}</Text>
                <Text style={styles.cmdDesc}>{primaryEA.description || 'Your Trading EA Is Ready.'}</Text>
              </View>
            ) : (
            <View style={[styles.heroWrap, !isNeon && { padding: 0, borderRadius: 28 }]}>
              {isNeon && <Animated.View style={[styles.heroNeonSpinner, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
              {isNeon && <Animated.View style={[styles.heroNeonGlow, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.4) 220deg, transparent 300deg, transparent 360deg)' }]} />}
              {primaryEAImage && !logoError ? (
                <ImageBackground
                  testID="ea-hero-bg"
                  source={{ uri: primaryEAImage }}
                  style={[styles.hero, Platform.OS === 'web' && { boxShadow: isNeon ? '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(' + a + ', 0.25), 0 0 80px rgba(' + a + ', 0.1)' : isLiquid ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' : '0 8px 24px rgba(0,0,0,0.5), 0 0 30px rgba(' + a + ', 0.3), 0 0 60px rgba(' + a + ', 0.12)' }, isLiquid && { borderWidth: 1.5, borderColor: 'rgba(' + a + ', 0.4)', borderRadius: 32 }]}
                  imageStyle={styles.heroImageStyle}
                  onError={(error) => { console.log('EA Image Error:', error); setLogoError(true); }}
                  resizeMode="cover"
                >
                  {false && renderBubbles(heroBubbles)}
                  {isNeon && <View style={[styles.heroRefraction, Platform.OS === 'web' && { background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)' }]} />}
                  <View style={styles.heroNameOverlay}>
                    <Text testID="ea-title" style={styles.botMainName} numberOfLines={3} ellipsizeMode="tail">{primaryEA.name}</Text>
                  </View>
                </ImageBackground>
              ) : (
                <View style={[styles.heroFallback, Platform.OS === 'web' && { boxShadow: isNeon ? '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(' + a + ', 0.25), 0 0 80px rgba(' + a + ', 0.1)' : isLiquid ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)' : '0 8px 24px rgba(0,0,0,0.5), 0 0 30px rgba(' + a + ', 0.3), 0 0 60px rgba(' + a + ', 0.12)' }, isLiquid && { borderWidth: 1.5, borderColor: 'rgba(' + a + ', 0.4)', borderRadius: 32 }]}>
                  <Image testID="fallback-app-icon" source={require('../../assets/images/icon.png')} style={styles.fallbackIcon} resizeMode="contain" />
                  {false && renderBubbles(heroBubbles)}
                  {isNeon && <View style={[styles.heroRefraction, Platform.OS === 'web' && { background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)' }]} />}
                  <View style={styles.heroNameOverlay}>
                    <Text testID="ea-title" style={styles.botMainName} numberOfLines={3} ellipsizeMode="tail">{primaryEA.name}</Text>
                  </View>
                </View>
              )}
            </View>
            )}

          </View>
        )}

        {/* NO EA — only when genuinely no EA connected */}
        {!primaryEA && (
          <View style={styles.mainEAContainer}>
            <RobotLogo size={200} />
            <View style={styles.botInfoContainer}>
              <Text style={styles.botMainName}>NO EA CONNECTED</Text>
              <Text style={styles.botDescription}>ADD A LICENSE KEY TO GET STARTED</Text>
            </View>
          </View>
        )}

        {!isMech && <View style={styles.connectedBotsSection}>
          {/* ========== 2. TRADING PANEL ==========
              A quiet capsule, not a neon card: it reads as a header for the
              screen, so the animated ring is reserved for the live EA below. */}
          {primaryEA && (
            <View style={[styles.neonWrap, { borderRadius: shapeR + 2, padding: 0 }]}>
              {false && <Animated.View style={[styles.neonSpinner, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
              {false && <Animated.View style={[styles.neonGlowSpinner, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.4) 220deg, transparent 300deg, transparent 360deg)' }]} />}
              <View style={[styles.liquidInner, { borderRadius: shapeR, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }, Platform.OS === 'web' && (isNeon ? { background: 'rgba(255,255,255,0.035)', backdropFilter: 'blur(80px) saturate(200%)', WebkitBackdropFilter: 'blur(80px) saturate(200%)', boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.25), inset 0 -4px 12px rgba(0,0,0,0.4), inset 0 40px 60px -20px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(' + a + ', 0.2), 0 0 80px rgba(' + a + ', 0.08)' } : isLiquid ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.4) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 8px rgba(' + a + ', 0.5), 0 0 20px rgba(' + a + ', 0.35), 0 0 40px rgba(' + a + ', 0.2), 0 0 70px rgba(' + a + ', 0.1)' } : isCmd ? { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 0 12px rgba(' + cmdRedRgb + ', 0.35), 0 0 24px rgba(' + cmdRedRgb + ', 0.2), 0 8px 20px rgba(0,0,0,0.5)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.4), 0 0 30px rgba(' + a + ', 0.35), 0 0 60px rgba(' + a + ', 0.15)' }), { borderRadius: shapeR }, !isNeon && { borderWidth: isCmd ? 2 : isLiquid ? 1.5 : 0.5, borderColor: isCmd ? cmdRed : isLiquid ? 'rgba(' + a + ', 0.4)' : 'rgba(255,255,255,0.08)' }, { overflow: 'hidden' }]}>
                {/* Full-cover robot background on trading panel */}
                {cardBgMode === 'fullcover' && primaryEAImage && Platform.OS === 'web' && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundImage: 'url(' + primaryEAImage + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.25 } as any} />
                )}                {false && renderBubbles(cardBubbles)}
                {false && <View style={[styles.refraction, Platform.OS === 'web' && { background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 100%)' }]} />}
                {false && <View style={[styles.meniscus, Platform.OS === 'web' && { background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 100%)' }]} />}
                <View style={styles.bottomActions}>
                  <TouchableOpacity testID="action-quotes" style={[styles.actionButton, styles.secondaryButton]} onPress={handleQuotes}>
                    <View style={styles.buttonIconContainer}>
                      <TrendingUp color={'rgba(255,255,255,0.45)'} size={14} />
                    </View>
                    <Text style={[styles.secondaryButtonText, isCmd && { color: cmdRed }]}>QUOTES</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="action-start" style={[styles.actionButton, styles.tradeButton, isBotActive && styles.tradeButtonActive]} onPress={handleToggleBot}>
                    <View style={[styles.tradeIconOuter, isPill && { width: 72, height: 72, borderRadius: 36 }]}>
                      {false && <Animated.View style={[styles.tradeIconSpinner, { transform: [{ rotate: tradeSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + cc + ' 60deg, rgba(' + ca + ', 0.5) 120deg, transparent 180deg, transparent 240deg, ' + cc + ' 300deg, transparent 360deg)' }]} />}
                      {false && <Animated.View style={[styles.tradeIconGlow, { transform: [{ rotate: tradeSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + ca + ', 0.5) 60deg, transparent 180deg, rgba(' + ca + ', 0.5) 300deg, transparent 360deg)' }]} />}
                      <View style={[styles.tradeIconInner, isPill && { width: 64, height: 64, borderRadius: 32 }]}>
                        {isBotActive ? <Square color={cc} size={15} fill={cc} style={Platform.OS === 'web' ? { filter: 'drop-shadow(0 0 6px rgba(' + ca + ', 0.7))' } : {}} /> : <Play color={cc} size={15} fill={cc} style={Platform.OS === 'web' ? { filter: 'drop-shadow(0 0 6px rgba(' + ca + ', 0.7))' } : {}} />}
                      </View>
                    </View>
                    <Text style={[styles.tradeButtonText, { color: ac }, isBotActive && styles.tradeButtonTextActive]}>{isBotActive ? 'STOP' : 'TRADE'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID="action-remove" style={[styles.actionButton, styles.removeButton]} onPress={handleRemoveActiveBot}>
                    <View style={styles.buttonIconContainer}>
                      <Trash2 color={'rgba(255,255,255,0.45)'} size={14} />
                    </View>
                    <Text style={[styles.removeButtonText, isCmd && { color: cmdRed }]}>REMOVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* ========== POWERED BY ========== */}
          {primaryEA && (
            <View style={styles.poweredByWrap}>
              <Text style={styles.poweredByText}>Powered by <Text style={[styles.poweredByAccent, { color: isCmd ? cmdRed : ac }]}>EA NAPTUNE</Text></Text>
            </View>
          )}

          {otherEAs.length > 0 && (
            <>
              <View testID="connected-bots-header" style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>CONNECTED BOTS</Text>
                <View testID="connected-bots-count" style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{eas.length}</Text>
                </View>
              </View>
              {otherEAs.map((ea, index) => (
                <TouchableOpacity
                  key={`${ea.id}-${index}`}
                  style={styles.botCard}
                  onPress={async () => {
                    try { console.log('Switching active EA to:', ea.name); await setActiveEA(ea.id); } catch (error) { console.error('Failed:', error); }
                  }}
                >
                  <View style={styles.botCardContent}>
                    <View style={styles.botIcon}>
                      {getEAImageUrl(ea as unknown as EA) ? (
                        <Image testID={`ea-logo-small-${index}`} source={{ uri: getEAImageUrl(ea as unknown as EA) as string }} style={styles.smallLogo} />
                      ) : (
                        <View style={styles.robotFace}><View style={styles.robotEye} /><View style={styles.robotEye} /></View>
                      )}
                    </View>
                    <Text style={styles.botName} numberOfLines={2} ellipsizeMode="tail">{ea.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Sectioned layout groups the screen under quiet labels instead of
              presenting every card at the same weight. */}
          {isSectioned && primaryEA && (
            <Text style={styles.groupLabel}>YOUR EA</Text>
          )}

          {/* ========== 3. ACTIVE EA INFO CARD — NEON WRAPPED ========== */}
          {primaryEA && (
            <View style={[styles.neonWrapInfo, { borderRadius: shapeRInfo + 2 }, !isNeon && { padding: 0 }, isPill && { alignSelf: 'center' as any }, (isLiquid || isMinimal) && Platform.OS === 'web' && { boxShadow: '0 0 4px rgba(' + a + ',0.7), 0 0 10px rgba(' + a + ',0.4), 0 0 25px rgba(' + a + ',0.2)', borderRadius: shapeRInfo + 2 } as any]}>
              {isNeon && <Animated.View style={[styles.neonSpinnerInfo, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
              {isNeon && <Animated.View style={[styles.neonGlowInfo, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.4) 220deg, transparent 300deg, transparent 360deg)' }]} />}
              <TouchableOpacity activeOpacity={0.7} onPress={() => {}} style={[styles.eaInfoCard, !isNeon && { borderWidth: isCmd ? 2 : isLiquid ? 1.5 : 0.5, borderColor: isCmd ? cmdRed : isLiquid ? 'rgba(' + a + ', 0.4)' : 'rgba(255,255,255,0.08)' }, Platform.OS === 'web' && (isNeon ? { background: '#0c0c0c', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)' } : isLiquid ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.4) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 8px rgba(' + a + ', 0.5), 0 0 20px rgba(' + a + ', 0.35), 0 0 40px rgba(' + a + ', 0.2), 0 0 70px rgba(' + a + ', 0.1)' } : isCmd ? { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 0 10px rgba(' + cmdRedRgb + ', 0.3), 0 0 20px rgba(' + cmdRedRgb + ', 0.18), 0 4px 14px rgba(0,0,0,0.4)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.35), 0 0 24px rgba(' + a + ', 0.3), 0 0 48px rgba(' + a + ', 0.12)' }), { borderRadius: shapeRInfo }, { overflow: 'hidden' }]}>
                {/* Full-cover robot background */}
                {cardBgMode === 'fullcover' && primaryEAImage && Platform.OS === 'web' && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundImage: 'url(' + primaryEAImage + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3 } as any} />
                )}
                {cardBgMode === 'thumbnail' && (
                  <View style={styles.eaInfoImageWrap}>
                    {primaryEAImage && !logoError ? (
                      <Image source={{ uri: primaryEAImage }} style={styles.eaInfoImage} resizeMode="cover" />
                    ) : (
                      <Image source={require('../../assets/images/icon.png')} style={styles.eaInfoImage} resizeMode="contain" />
                    )}
                  </View>
                )}
                <View style={[styles.eaInfoTextWrap, { zIndex: 1 }]}>
                  <Text style={styles.eaInfoName} numberOfLines={2}>{primaryEA.name}</Text>
                  <Text style={[styles.eaInfoStatus, { color: isBotActive ? '#16A34A' : 'rgba(255,255,255,0.4)' }]}>
                    {isBotActive ? 'RUNNING' : 'IDLE'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        
          {isSectioned && <Text style={styles.groupLabel}>TOOLS</Text>}

{/* ========== CHART SCANNER CARD ========== */}
          <View style={[styles.neonWrapPill, { borderRadius: shapeRAdd + 2 }, !isNeon && { padding: 0 }, isPill && { alignSelf: 'center' as any }, (isLiquid || isMinimal) && Platform.OS === 'web' && { boxShadow: '0 0 4px rgba(' + a + ',0.7), 0 0 10px rgba(' + a + ',0.4), 0 0 25px rgba(' + a + ',0.2)', borderRadius: shapeRAdd + 2 } as any]}>
            {isNeon && <Animated.View style={[styles.neonSpinnerPill, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
            {isNeon && <Animated.View style={[styles.neonGlowSpinnerPill, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.4) 220deg, transparent 300deg, transparent 360deg)' }]} />}
            <TouchableOpacity style={[styles.liquidInnerPill, { borderRadius: shapeRAdd }, !isNeon && { borderWidth: isCmd ? 2 : isLiquid ? 1.5 : 0.5, borderColor: isCmd ? cmdRed : isLiquid ? 'rgba(' + a + ', 0.4)' : 'rgba(255,255,255,0.08)' }, Platform.OS === 'web' && (isNeon ? { background: '#0c0c0c', backdropFilter: 'blur(80px) saturate(200%)', WebkitBackdropFilter: 'blur(80px) saturate(200%)', boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.25), inset 0 -4px 12px rgba(0,0,0,0.4), inset 0 40px 60px -20px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(' + a + ', 0.2), 0 0 80px rgba(' + a + ', 0.08)' } : isLiquid ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.4) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 8px rgba(' + a + ', 0.5), 0 0 20px rgba(' + a + ', 0.35), 0 0 40px rgba(' + a + ', 0.2), 0 0 70px rgba(' + a + ', 0.1)' } : isCmd ? { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 0 10px rgba(' + cmdRedRgb + ', 0.3), 0 0 20px rgba(' + cmdRedRgb + ', 0.18), 0 6px 18px rgba(0,0,0,0.4)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.4), 0 0 30px rgba(' + a + ', 0.35), 0 0 60px rgba(' + a + ', 0.15)' })] } onPress={tryScannerOpen} activeOpacity={0.7}>
              {false && renderBubbles(pillBubbles)}
              {isNeon && <View style={[styles.refractionPill, Platform.OS === 'web' && { background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 100%)' }]} />}
              {false && <View style={[styles.meniscusPill, Platform.OS === 'web' && { background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 100%)' }]} />}
              <BarChart3 color={cc} size={20} style={{ zIndex: 5 }} />
              <View style={[styles.addEATextContainer, { zIndex: 5 }]}>
                <Text style={styles.addEATitle}>CHART SCANNER</Text>
                <Text style={styles.addEASubtitle}>AI-POWERED TRADE ANALYSIS</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ========== 4. ADD EA — LIQUID GLASS PILL ========== */}
          <View style={[styles.neonWrapPill, { borderRadius: shapeRAdd + 2 }, !isNeon && { padding: 0 }, isPill && { alignSelf: 'center' as any }, (isLiquid || isMinimal) && Platform.OS === 'web' && { boxShadow: '0 0 4px rgba(' + a + ',0.7), 0 0 10px rgba(' + a + ',0.4), 0 0 25px rgba(' + a + ',0.2)', borderRadius: shapeRAdd + 2 } as any]}>
            {isNeon && <Animated.View style={[styles.neonSpinnerPill, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
            {isNeon && <Animated.View style={[styles.neonGlowSpinnerPill, { transform: [{ rotate: cardSpinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.4) 220deg, transparent 300deg, transparent 360deg)' }]} />}
            <TouchableOpacity style={[styles.liquidInnerPill, { borderRadius: shapeRAdd }, !isNeon && { borderWidth: isCmd ? 2 : isLiquid ? 1.5 : 0.5, borderColor: isCmd ? cmdRed : isLiquid ? 'rgba(' + a + ', 0.4)' : 'rgba(255,255,255,0.08)' }, Platform.OS === 'web' && (isNeon ? { background: '#0c0c0c', backdropFilter: 'blur(80px) saturate(200%)', WebkitBackdropFilter: 'blur(80px) saturate(200%)', boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.25), inset 0 -4px 12px rgba(0,0,0,0.4), inset 0 40px 60px -20px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(' + a + ', 0.2), 0 0 80px rgba(' + a + ', 0.08)' } : isLiquid ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.4) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 8px rgba(' + a + ', 0.5), 0 0 20px rgba(' + a + ', 0.35), 0 0 40px rgba(' + a + ', 0.2), 0 0 70px rgba(' + a + ', 0.1)' } : isCmd ? { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 0 10px rgba(' + cmdRedRgb + ', 0.3), 0 0 20px rgba(' + cmdRedRgb + ', 0.18), 0 6px 18px rgba(0,0,0,0.4)' } : { background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.5) 100%)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.1), 0 8px 24px rgba(0,0,0,0.4), 0 0 30px rgba(' + a + ', 0.35), 0 0 60px rgba(' + a + ', 0.15)' })] } onPress={handleAddNewEA} activeOpacity={0.7}>
              {false && renderBubbles(pillBubbles)}
              {isNeon && <View style={[styles.refractionPill, Platform.OS === 'web' && { background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 40%, transparent 100%)' }]} />}
              {false && <View style={[styles.meniscusPill, Platform.OS === 'web' && { background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 100%)' }]} />}
              <Plus color={cc} size={20} style={{ zIndex: 5 }} />
              <View style={[styles.addEATextContainer, { zIndex: 5 }]}>
                <Text style={styles.addEATitle}>ADD A NEW EA</Text>
                <Text style={styles.addEASubtitle}>HAVE A VALID LICENSE KEY</Text>
              </View>
            </TouchableOpacity>
          </View>

          </View>}

      </ScrollView>

      {/* ========== REMOVE WARNING MODAL ========== */}
      <NeonModal
        visible={showRemoveWarning}
        onClose={() => setShowRemoveWarning(false)}
        icon={<Trash2 color={theme.accent} size={26} />}
        title="REMOVE EA"
        message={`Are you sure you want to remove ${primaryEA?.name || 'this EA'}? This action cannot be undone.`}
      >
        <NeonModalButton label="REMOVE" kind="danger" onPress={confirmRemoveBot} />
        <NeonModalButton label="Cancel" kind="ghost" onPress={() => setShowRemoveWarning(false)} />
      </NeonModal>

      {/* Scanner access gate — shows when user taps CHART SCANNER without a connected MT4/MT5 account */}
      <NeonModal
        visible={!!scannerGateMsg}
        onClose={() => setScannerGateMsg(null)}
        icon={<Shield color={theme.accent} size={26} />}
        title="SETUP REQUIRED"
        message={scannerGateMsg ?? ''}
      >
        <NeonModalButton
          label="CONNECT ACCOUNT"
          onPress={() => { setScannerGateMsg(null); router.push('/(tabs)/metatrader'); }}
        />
        <NeonModalButton label="Cancel" kind="ghost" onPress={() => setScannerGateMsg(null)} />
      </NeonModal>

      {/* Quick trade setup — opens every time Start is pressed (MT5 connected). */}
      <QuickConfigModal
        visible={quickStartOpen}
        uuid={mt5Account?.uuid}
        accent={theme.accent}
        onClose={() => { setQuickStartOpen(false); setBotStarting(false); }}
        onConfirm={handleQuickStartConfirm}
      />
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  /* ========== SPLASH ========== */
  splashContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF1A1A',
    marginTop: 20,
    letterSpacing: 3,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  splashStartButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 60,
    paddingVertical: 16,
    borderRadius: 999,
    minWidth: 200,
    borderWidth: 2,
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  startButtonText: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* ========== COMMANDER MODE ========== */
  cmdBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 0,
    backgroundColor: '#050505',
  },
  cmdHero: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  cmdPortrait: {
    width: 160,
    height: 160,
    borderRadius: 80,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 18,
    padding: 3,
  },
  cmdRing: {
    position: 'absolute',
    top: '-25%', left: '-25%',
    width: '150%', height: '150%',
  },
  cmdPortraitImg: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
    zIndex: 1,
    borderWidth: 3,
    borderColor: '#111',
  },
  cmdName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  cmdDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },

  /* ========== MAIN LAYOUT ========== */
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 100,
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
  mainEAContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 0,
    position: 'relative',
    overflow: 'hidden',
  },

  /* ========== HERO — LIQUID GLASS WRAP ========== */
  heroWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: 32,
    padding: 3,
    overflow: 'hidden',
  },
  heroNeonSpinner: {
    position: 'absolute',
    top: '-25%',
    left: '-25%',
    width: '150%',
    height: '150%',
  },
  heroNeonGlow: {
    position: 'absolute',
    top: '-30%',
    left: '-30%',
    width: '160%',
    height: '160%',
    ...(Platform.OS === 'web' && {
      filter: 'blur(18px)',
    }),
  },
  hero: {
    width: '100%',
    height: 500,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 18,
  },
  heroImageStyle: {
    borderRadius: 30,
  },
  heroFallback: {
    width: '100%',
    height: 500,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 18,
  },
  fallbackIcon: {
    width: 160,
    height: 160,
    borderRadius: 32,
    zIndex: 5,
  },
  heroRefraction: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    zIndex: 3,
  },

  /* ========== BUBBLES ========== */
  bubblesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },

  /* ========== REFRACTION & MENISCUS ========== */
  refraction: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    zIndex: 2,
  },
  meniscus: {
    position: 'absolute',
    top: '30%',
    left: '-10%',
    right: '-10%',
    height: 30,
    zIndex: 2,
    transform: [{ rotate: '-3deg' }],
  },
  refractionPill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: 26,
    zIndex: 2,
  },
  meniscusPill: {
    position: 'absolute',
    top: '25%',
    left: '-10%',
    right: '-10%',
    height: 30,
    zIndex: 2,
    transform: [{ rotate: '-3deg' }],
  },

  /* ========== HERO NAME OVERLAY ========== */
  heroNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 24,
    paddingHorizontal: 20,
    zIndex: 10,
    ...(Platform.OS === 'web' && {
      background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)',
    }),
  },
  botMainName: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  botDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  botInfoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },

  /* ========== NEON WRAP — TRADING PANEL ========== */
  neonWrap: {
    position: 'relative',
    borderRadius: 28,
    padding: 2.5,
    overflow: 'hidden',
    marginBottom: 20,
  },
  neonSpinner: {
    position: 'absolute',
    top: '-25%',
    left: '-25%',
    width: '150%',
    height: '150%',
  },
  neonGlowSpinner: {
    position: 'absolute',
    top: '-30%',
    left: '-30%',
    width: '160%',
    height: '160%',
    ...(Platform.OS === 'web' && {
      filter: 'blur(16px)',
    }),
  },

  /* ========== LIQUID INNER — OPAQUE DEFAULT ========== */
  liquidInner: {
    borderRadius: 26,
    backgroundColor: 'rgba(12, 12, 12, 0.93)',
    position: 'relative',
    overflow: 'hidden',
  },
  liquidInnerPill: {
    borderRadius: 26,
    backgroundColor: 'rgba(12, 12, 12, 0.93)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 24,
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
  },

  /* ========== NEON WRAP — ADD EA PILL ========== */
  neonWrapPill: {
    position: 'relative',
    borderRadius: 28,
    padding: 2.5,
    overflow: 'hidden',
    marginBottom: 24,
  },
  neonSpinnerPill: {
    position: 'absolute',
    top: '-50%',
    left: '-25%',
    width: '150%',
    height: '200%',
  },
  neonGlowSpinnerPill: {
    position: 'absolute',
    top: '-60%',
    left: '-30%',
    width: '160%',
    height: '220%',
    ...(Platform.OS === 'web' && {
      filter: 'blur(16px)',
    }),
  },

  /* ========== TRADE ICON SPINNER ========== */
  tradeIconOuter: {
    position: 'relative',
    width: 18,
    height: 18,
    borderRadius: 0,
    padding: 0,
    // No clipping: it existed to mask the rotating ring into a circle, and with
    // the ring gone it only chops the icon's glow into a square.
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeIconSpinner: {
    position: 'absolute',
    top: '-25%',
    left: '-25%',
    width: '150%',
    height: '150%',
  },
  tradeIconGlow: {
    position: 'absolute',
    top: '-35%',
    left: '-35%',
    width: '170%',
    height: '170%',
    ...(Platform.OS === 'web' && {
      filter: 'blur(8px)',
    }),
  },
  tradeIconInner: {
    width: 18,
    height: 18,
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    ...(Platform.OS === 'web' && {
      boxShadow: 'none',
    }),
  },

  /* ========== TRADING PANEL — COMPACT ========== */
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 6,
    paddingVertical: 8,
    zIndex: 5,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Row, not column: putting the label beside the icon rather than under it
    // is what actually halves the panel height.
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
    backgroundColor: 'transparent',
  },
  tradeButton: {
    backgroundColor: 'transparent',
  },
  tradeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
  },
  removeButton: {
    backgroundColor: 'transparent',
  },
  buttonIconContainer: {
    // Pure spacer. No fill, no border, no shadow — the inset gloss that used to
    // sit here only read as a ring because the box was round; without a radius
    // it draws a square.
    width: 18,
    height: 18,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    borderWidth: 0,
  },
  tradeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  tradeButtonTextActive: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  removeButtonText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  /* ========== POWERED BY ========== */
  poweredByWrap: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  poweredByText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  poweredByAccent: {
    fontWeight: '700',
  },

  /* ========== CONNECTED BOTS ========== */
  connectedBotsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    position: 'relative',
    marginTop: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    zIndex: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  /* Sectioned mode: a quiet caption over each group. Deliberately lighter than
     sectionTitle so it organises without competing with the cards. */
  groupLabel: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    minWidth: 28,
    alignItems: 'center',
  },
  sectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  botCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  botCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  botIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  smallLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  robotFace: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  robotEye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#000000',
    marginHorizontal: 2,
  },
  botName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'center',
  },

  /* ========== ADD EA TEXT ========== */
  addEATextContainer: {
    marginLeft: 12,
  },
  addEATitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  addEASubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  /* ========== EA INFO CARD — NEON WRAP ========== */
  neonWrapInfo: {
    position: 'relative', borderRadius: 24, padding: 2.5,
    overflow: 'hidden', marginBottom: 30,
  },
  neonSpinnerInfo: {
    position: 'absolute', top: '-50%', left: '-25%', width: '150%', height: '200%',
  },
  neonGlowInfo: {
    position: 'absolute', top: '-60%', left: '-30%', width: '160%', height: '220%',
    ...(Platform.OS === 'web' && { filter: 'blur(16px)' }),
  },
  eaInfoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(12, 12, 12, 0.93)', borderRadius: 22,
    paddingVertical: 12, paddingHorizontal: 18, position: 'relative', overflow: 'hidden',
  },
  eaInfoImageWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  eaInfoImage: {
    // Fills the wrapper rather than a fixed size, so resizing the tile can't
    // silently crop the logo again.
    width: '100%',
    height: '100%',
  },
  eaInfoTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  eaInfoName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eaInfoStatus: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },

  /* ========== REMOVE WARNING MODAL ========== */
});
