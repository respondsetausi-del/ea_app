import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, TouchableWithoutFeedback, Alert } from 'react-native';
import { Home, TrendingUp, Settings, X, LogOut } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useSidebar } from '@/providers/sidebar-provider';
import { useTheme } from '@/providers/theme-provider';
import { useApp } from '@/providers/app-provider';
import { CandleLogo } from '@/components/candle-logo';

const SIDEBAR_WIDTH = 280;

const NAV_ITEMS = [
  { key: '/', label: 'Home', icon: Home, route: '/' },
  { key: '/metatrader', label: 'MetaTrader', icon: TrendingUp, route: '/metatrader' },
  { key: '/settings', label: 'Settings', icon: Settings, route: '/settings' },
];

const MUTED = 'rgba(255,255,255,0.45)';
const HAIRLINE = 'rgba(255,255,255,0.10)';

export function Sidebar() {
  const { isOpen, close } = useSidebar();
  const { theme } = useTheme();
  const { user, eas, signOut } = useApp();
  const a = theme.accentRgb;
  const ac = theme.accent;
  const pathname = usePathname();

  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayAnim, {
        toValue: isOpen ? 1 : 0,
        duration: isOpen ? 250 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen]);

  const handleNav = (route: string) => {
    close();
    setTimeout(() => router.push(route as any), 100);
  };

  const handleSignOut = () => {
    const doSignOut = async () => {
      close();
      await signOut();
      router.replace('/login');
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm('Sign out of EA NAPTUNE?')) return;
      doSignOut();
      return;
    }
    Alert.alert('Sign out', 'Sign out of EA NAPTUNE?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: doSignOut },
    ]);
  };

  return (
    <>
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[styles.overlay, { opacity: overlayAnim }]}
      >
        <TouchableWithoutFeedback onPress={close}>
          <View style={styles.overlayTouch} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        {/* Brand */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={[styles.brandMark, { shadowColor: ac }]}>
              <CandleLogo size={20} color={ac} />
            </View>
            <Text style={styles.brandName}>EA NAPTUNE</Text>
          </View>
          <TouchableOpacity onPress={close} style={styles.closeBtn} activeOpacity={0.6}>
            <X color={MUTED} size={16} />
          </TouchableOpacity>
        </View>

        <Text style={styles.groupLabel}>MENU</Text>

        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.key ||
              (item.key === '/' && (pathname === '/index' || pathname === ''));
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.navItem,
                  isActive && { backgroundColor: 'rgba(' + a + ', 0.14)', borderColor: 'rgba(' + a + ', 0.4)' },
                ]}
                onPress={() => handleNav(item.route)}
                activeOpacity={0.6}
              >
                <Icon color={isActive ? ac : MUTED} size={17} />
                <Text style={[styles.navLabel, isActive && { color: '#FFFFFF' }]}>{item.label}</Text>
                {isActive && <View style={[styles.activeDot, { backgroundColor: ac }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Everything below is pinned to the bottom by this spacer, which is
            what closes the dead gap the old layout left mid-panel. */}
        <View style={{ flex: 1 }} />

        {user?.email && (
          <>
            <Text style={styles.groupLabel}>ACCOUNT</Text>
            <View style={styles.accountCard}>
              <Text style={styles.accountEmail} numberOfLines={1} ellipsizeMode="tail">
                {user.email}
              </Text>
              <Text style={styles.accountMeta}>
                {eas.length === 0
                  ? 'No EA activated'
                  : eas.length === 1
                    ? '1 EA activated'
                    : eas.length + ' EAs activated'}
              </Text>
            </View>

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.6}>
              <LogOut color="rgba(255,120,120,0.85)" size={15} />
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.version}>Version 1.0</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 998,
  },
  overlayTouch: { flex: 1 },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    // Flat and quiet, matching the cards: one hairline edge instead of the
    // old shine overlay, gradient edge strip and inset highlights.
    backgroundColor: '#0B0B0C',
    borderRightWidth: 1,
    borderRightColor: HAIRLINE,
    zIndex: 999,
    paddingTop: 56,
    paddingHorizontal: 14,
    paddingBottom: 22,
    ...(Platform.OS === 'web' && {
      boxShadow: '12px 0 40px rgba(0,0,0,0.5)',
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.6,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  // Same caption treatment as the home screen's section labels.
  groupLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 6,
  },
  navList: { gap: 6 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    // Capsules, matching the card language — and no square icon wrapper.
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: MUTED,
    letterSpacing: 0.3,
    flex: 1,
  },
  activeDot: { width: 5, height: 5, borderRadius: 2.5 },
  accountCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  accountEmail: { fontSize: 12.5, fontWeight: '600', color: '#FFFFFF' },
  accountMeta: { fontSize: 10.5, color: MUTED, marginTop: 3, letterSpacing: 0.3 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,120,120,0.2)',
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,120,120,0.85)',
    letterSpacing: 0.3,
  },
  version: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.22)',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 16,
  },
});
