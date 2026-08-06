import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Animated, Platform, RefreshControl } from 'react-native';
import { ArrowLeft, Circle, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '@/providers/app-provider';
import { useTheme } from '@/providers/theme-provider';
import { CONTENT_MAX_WIDTH, GROUP_LABEL, INK, SIGNAL, radii, screenWash, shapePadding, webPressable } from '@/constants/neon';
import { NeonCard } from '@/components/neon-card';
import { PageBackground } from '@/components/page-background';
import { Symbol as ApiSymbol, apiService } from '@/services/api';

interface Quote {
  symbol: string;
  lotSize: number;
  platform: string;
  direction: 'BUY' | 'SELL' | 'BOTH';
  isActive?: boolean;
}



/**
 * Symbols come from the connected MT5 account and nowhere else.
 *
 * This screen used to fall back to a hardcoded list (EURUSD, XAUUSD, …) when
 * no account was connected. That was worse than showing nothing: broker
 * symbols carry exact casing and suffixes — the real instrument is
 * `XAUUSD.mic`, not `XAUUSD` — so configuring a made-up symbol produced trades
 * the broker rejects, with no error anywhere the user could see. If there's no
 * account, the screen now says so.
 */

export default function QuotesScreen() {
  const { eas, activeSymbols, mt4Symbols, mt5Symbols, mt5Account, ensureMT5Connected } = useApp();
  const { theme: thm, cardShape } = useTheme();
  const a = thm.accentRgb;
  const ac = thm.accent;
  const cc = ac;
  const R = radii(cardShape);
  const padH = shapePadding(cardShape);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [apiSymbols, setApiSymbols] = useState<ApiSymbol[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState<string | null>(null);

  const primaryEA = eas.length > 0 ? eas[0] : null;
  const primaryEAImage = (() => {
    if (!primaryEA || !primaryEA.userData || !primaryEA.userData.owner) return null;
    const raw = (primaryEA.userData.owner.logo || '').toString().trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://tradeportea.com/admin/uploads/' + raw.replace(/^\/+/, '');
  })();
  const hasActiveQuotes = activeSymbols.length > 0 || mt4Symbols.length > 0 || mt5Symbols.length > 0;
  const mt5Connected = !!(mt5Account?.uuid && mt5Account.connected);

  // Merge quotes with active symbol status
  const quotesWithActiveStatus = quotes.map(quote => ({
    ...quote,
    isActive: activeSymbols.some(activeSymbol => activeSymbol.symbol === quote.symbol) ||
      mt4Symbols.some(mt4Symbol => mt4Symbol.symbol === quote.symbol) ||
      mt5Symbols.some(mt5Symbol => mt5Symbol.symbol === quote.symbol)
  }));

  // Pull the broker's symbol universe from the connected MT5 account.
  const fetchSymbols = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // No account, no symbols — the empty state points at MetaTrader.
      if (!mt5Account?.uuid || !mt5Account.connected) {
        setApiSymbols([]);
        setQuotes([]);
        return;
      }

      // Probe, reconnect, retry once — a stale UUID otherwise fails silently.
      let list: string[];
      try {
        list = await apiService.getMT5Symbols(mt5Account.uuid);
      } catch (fetchError) {
        const fresh = await ensureMT5Connected();
        if (!fresh) throw fetchError;
        list = await apiService.getMT5Symbols(fresh);
      }

      const syms = Array.isArray(list) ? list : [];
      const response: { data: ApiSymbol[] } = { data: syms.map((s) => ({ id: s, name: s })) };
      setApiSymbols(response.data);
      // Convert API symbols to quotes with actual saved data or defaults
      const newQuotes: Quote[] = response.data.map(apiSymbol => {
        const symbolName = apiSymbol.name;

        // Consolidate configs across legacy, MT4 and MT5 and pick the most recently activated
        const legacyConfig = activeSymbols.find(s => s.symbol === symbolName);
        const mt4Config = mt4Symbols.find(s => s.symbol === symbolName);
        const mt5Config = mt5Symbols.find(s => s.symbol === symbolName);

        type Unified = { platform: 'MT4' | 'MT5'; lotSize: number; direction: 'BUY' | 'SELL' | 'BOTH'; activatedAt: Date };

        const candidates: Unified[] = [];

        if (legacyConfig) {
          const lot = Number.parseFloat(legacyConfig.lotSize ?? '0.01');
          const act = legacyConfig.activatedAt instanceof Date ? legacyConfig.activatedAt : new Date(legacyConfig.activatedAt as unknown as string);
          candidates.push({ platform: legacyConfig.platform, lotSize: Number.isFinite(lot) ? lot : 0.01, direction: legacyConfig.direction, activatedAt: act });
        }
        if (mt4Config) {
          const lot = Number.parseFloat(mt4Config.lotSize ?? '0.01');
          const act = mt4Config.activatedAt instanceof Date ? mt4Config.activatedAt : new Date(mt4Config.activatedAt as unknown as string);
          candidates.push({ platform: 'MT4', lotSize: Number.isFinite(lot) ? lot : 0.01, direction: mt4Config.direction, activatedAt: act });
        }
        if (mt5Config) {
          const lot = Number.parseFloat(mt5Config.lotSize ?? '0.01');
          const act = mt5Config.activatedAt instanceof Date ? mt5Config.activatedAt : new Date(mt5Config.activatedAt as unknown as string);
          candidates.push({ platform: 'MT5', lotSize: Number.isFinite(lot) ? lot : 0.01, direction: mt5Config.direction, activatedAt: act });
        }

        if (candidates.length > 0) {
          const latest = candidates.sort((a, b) => (b.activatedAt?.getTime?.() ?? 0) - (a.activatedAt?.getTime?.() ?? 0))[0];
          console.log('Using latest config for symbol', symbolName, latest);
          return {
            symbol: symbolName,
            lotSize: latest.lotSize,
            platform: latest.platform,
            direction: latest.direction,
          };
        }

        // Return default values if no saved configuration
        return {
          symbol: symbolName,
          lotSize: 0.01,
          platform: 'MT5' as const,
          direction: 'BUY' as const
        };
      });

      setQuotes(newQuotes);
    } catch (error) {
      console.error('Error fetching symbols:', error);
      // Surface the real reason. Standing in fabricated symbols here is what
      // produced silently-rejected trades before.
      const detail = error instanceof Error ? error.message : '';
      setError(detail ? `Couldn't reach your MT5 account — ${detail}` : "Couldn't reach your MT5 account");
    } finally {
      // Add a small delay to make the refresh feel more natural
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, showRefreshIndicator ? 300 : 0);
    }
  }, [activeSymbols, mt4Symbols, mt5Symbols, mt5Account?.uuid, mt5Account?.connected, ensureMT5Connected]);

  // Reload when the MT5 connection changes or a symbol config is saved.
  useEffect(() => {
    // Only do a full refresh if we don't have quotes yet, otherwise do a gentle refresh
    if (quotes.length === 0) {
      fetchSymbols(false);
    } else {
      // Gentle refresh to update the active status without disrupting the UI
      fetchSymbols(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mt5Account?.uuid, mt5Account?.connected, activeSymbols.length, mt4Symbols.length, mt5Symbols.length]);

  // Smooth rotation animation for refresh button
  useEffect(() => {
    if (refreshing) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      return () => {
        rotateAnimation.stop();
        // Smoothly reset to 0 when stopping
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      };
    }
  }, [refreshing, rotateAnim]);

  // Refresh when screen comes into focus (e.g., returning from trade-config)
  useFocusEffect(
    useCallback(() => {
      console.log('Quotes screen focused, refreshing (offline)...');
      if (quotes.length > 0) {
        setTimeout(() => fetchSymbols(true), 100);
      } else {
        fetchSymbols(false);
      }
    }, [fetchSymbols, quotes.length])
  );

  // Refresh function
  const handleRefresh = () => {
    console.log('Manual refresh triggered');
    fetchSymbols(true);
  };



  const handleBack = () => {
    router.back();
  };

  const handleRetry = () => {
    fetchSymbols();
  };

  const formatLotSize = (lotSize: number) => {
    return lotSize.toFixed(2);
  };





  const handleQuoteTap = (symbol: string) => {
    router.push(`/trade-config?symbol=${symbol}`);
  };

  const activeCount = quotesWithActiveStatus.filter(q => q.isActive).length;

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && ({ backgroundImage: screenWash(a) } as any)]}>
      <PageBackground eaImage={primaryEAImage} />

      {/* Header — the accent title and status dot mirror home's hero caption. */}
      <View style={styles.headerOuter}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, webPressable]} onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft color="rgba(255,255,255,0.8)" size={20} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { color: cc }]}>QUOTES</Text>
              {primaryEA && (
                <View style={styles.statusContainer}>
                  <Circle
                    color={hasActiveQuotes ? SIGNAL.live : INK.ghost}
                    fill={hasActiveQuotes ? SIGNAL.live : 'transparent'}
                    size={7}
                  />
                  <Text style={[styles.statusText, { color: hasActiveQuotes ? SIGNAL.live : INK.ghost }]}>
                    {hasActiveQuotes ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              )}
            </View>
            {primaryEA && <Text style={styles.botName} numberOfLines={1} ellipsizeMode="tail">{primaryEA.name}</Text>}
          </View>

          {mt5Connected && (
            <TouchableOpacity
              style={[styles.refreshButton, webPressable, refreshing && styles.refreshButtonDisabled]}
              onPress={handleRefresh}
              disabled={refreshing}
              activeOpacity={refreshing ? 1 : 0.7}
            >
              <Animated.View style={{ transform: [{ rotate: rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                <RefreshCw color={refreshing ? INK.ghost : 'rgba(255,255,255,0.8)'} size={18} />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator testID="quotes-loading" size="large" color={cc} />
            <Text style={styles.loadingText}>Loading symbols…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <NeonCard
              radius={R.row}
              ring
              onPress={mt5Connected ? handleRetry : () => router.push('/(tabs)/metatrader')}
              style={styles.ctaFace}
              wrapperStyle={styles.ctaWrap}
            >
              <Text style={[styles.ctaText, { color: cc, zIndex: 5 }]}>{mt5Connected ? 'RETRY' : 'CONNECT MT5'}</Text>
            </NeonCard>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchSymbols(true)} tintColor={cc} colors={[cc]} />}
          >
            {quotesWithActiveStatus.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {mt5Connected ? 'No symbols on this account' : 'No MT5 account connected'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {mt5Connected
                    ? 'Your broker returned an empty symbol list.'
                    : 'Symbols are pulled live from your broker. Connect MT5 to see them.'}
                </Text>
                {!mt5Connected && (
                  <NeonCard
                    radius={R.row}
                    ring
                    onPress={() => router.push('/(tabs)/metatrader')}
                    style={styles.ctaFace}
                    wrapperStyle={[styles.ctaWrap, { marginTop: 24 }]}
                  >
                    <Text style={[styles.ctaText, { color: cc, zIndex: 5 }]}>CONNECT MT5</Text>
                  </NeonCard>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.groupLabel}>
                  {apiSymbols.length > 0 ? `${apiSymbols.length} SYMBOLS` : 'SYMBOLS'}
                  {activeCount > 0 ? ` · ${activeCount} LIVE` : ''}
                </Text>
                {quotesWithActiveStatus.map((quote) => (
                  <NeonCard
                    key={quote.symbol}
                    testID={`quote-item-${quote.symbol}`}
                    radius={R.card}
                    /* The spinning rim marks the symbols actually trading, the
                       way home reserves it for the live EA. */
                    ring={quote.isActive}
                    accent={quote.isActive ? { color: SIGNAL.live, rgb: '48, 209, 88' } : undefined}
                    onPress={() => handleQuoteTap(quote.symbol)}
                    style={[styles.quoteFace, { paddingHorizontal: padH }]}
                    wrapperStyle={styles.quoteWrap}
                  >
                    <View style={styles.quoteHeader}>
                      <View style={styles.symbolContainer}>
                        <Text style={styles.symbol}>{quote.symbol}</Text>
                        {quote.isActive && <Circle color={SIGNAL.live} fill={SIGNAL.live} size={7} style={styles.activeIndicator} />}
                      </View>
                      <Text style={[styles.liveTag, { color: quote.isActive ? SIGNAL.live : INK.ghost }]}>
                        {quote.isActive ? 'LIVE' : 'IDLE'}
                      </Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <View style={styles.priceColumn}>
                        <Text style={styles.priceLabel}>LOT SIZE</Text>
                        <Text style={styles.priceValue}>{formatLotSize(quote.lotSize)}</Text>
                      </View>
                      <View style={styles.priceColumn}>
                        <Text style={styles.priceLabel}>PLATFORM</Text>
                        <Text style={styles.platformValue}>{quote.platform}</Text>
                      </View>
                      <View style={styles.priceColumn}>
                        <Text style={styles.priceLabel}>DIRECTION</Text>
                        <Text style={[styles.directionValue, { color: quote.direction === 'BUY' ? SIGNAL.buy : quote.direction === 'SELL' ? SIGNAL.sell : SIGNAL.both }]}>
                          {quote.direction}
                        </Text>
                      </View>
                    </View>
                  </NeonCard>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  /* Header sits in the same centred column as the list, so the back button
     lines up with the cards instead of hugging the viewport edge. */
  headerOuter: { width: '100%', paddingHorizontal: 20, zIndex: 10 },
  header: {
    width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
  },
  backButton: {
    marginRight: 14, width: 40, height: 40, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(60px) saturate(180%)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)',
    }),
  },
  headerContent: { flex: 1 },
  titleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 1.5, marginRight: 12 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 10, fontWeight: '700', marginLeft: 5, letterSpacing: 1 },
  botName: { color: INK.secondary, fontSize: 12, fontWeight: '500', marginTop: 3 },
  refreshButton: {
    marginLeft: 8, width: 40, height: 40, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(60px) saturate(180%)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)',
    }),
  },
  refreshButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.03)' },

  content: { flex: 1, paddingHorizontal: 20, zIndex: 10 },
  scrollContent: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingTop: 8, paddingBottom: 40 },
  groupLabel: { ...GROUP_LABEL, marginBottom: 12, marginLeft: 16 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: INK.secondary, fontSize: 15, marginTop: 16, fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  errorText: { color: SIGNAL.sell, fontSize: 15, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  ctaWrap: { width: '100%', maxWidth: 280 },
  ctaFace: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 14, fontWeight: '700', letterSpacing: 1.2 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: INK.primary, fontSize: 17, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { color: INK.secondary, fontSize: 13, textAlign: 'center' },

  quoteWrap: { marginBottom: 14 },
  quoteFace: { paddingVertical: 20 },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, zIndex: 5 },
  symbolContainer: { flexDirection: 'row', alignItems: 'center' },
  symbol: { color: INK.primary, fontSize: 16, fontWeight: '700', letterSpacing: 0.8 },
  activeIndicator: { marginLeft: 8 },
  liveTag: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  priceContainer: { flexDirection: 'row', justifyContent: 'space-between', zIndex: 5 },
  priceColumn: { alignItems: 'center', flex: 1 },
  priceLabel: { ...GROUP_LABEL, fontSize: 9, marginBottom: 6 },
  priceValue: { color: INK.primary, fontSize: 16, fontWeight: '600', fontFamily: 'monospace' },
  platformValue: { color: INK.secondary, fontSize: 13, fontWeight: '500', fontFamily: 'monospace' },
  directionValue: { fontSize: 14, fontWeight: '700', fontFamily: 'monospace', letterSpacing: 0.5 },
});