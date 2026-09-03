import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/providers/app-provider';
import { useTheme } from '@/providers/theme-provider';
import { CONTENT_MAX_WIDTH, GROUP_LABEL, INK, SIGNAL, radii, screenWash, shapePadding, webPressable } from '@/constants/neon';
import { NeonCard } from '@/components/neon-card';
import { apiService } from '@/services/api';
import { buildStrategyParams } from '@/utils/strategy-sync';

/**
 * Platform and direction no longer have pickers: the app only connects MT5,
 * and symbols are always traded both ways. They're fixed here and shown in the
 * header so the screen still states what it will send.
 */
const PLATFORM = 'MT5' as const;
const DIRECTION = 'BOTH' as const;

interface TradeConfig {
  lotSize: string;
  numberOfTrades: string;
}

export default function TradeConfigScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const { activeSymbols, activateSymbol, deactivateSymbol, mt4Symbols, mt5Symbols, activateMT4Symbol, activateMT5Symbol, deactivateMT4Symbol, deactivateMT5Symbol, isBotActive, mt5Account, eas } = useApp();
  const { theme: thm, cardShape } = useTheme();
  const a = thm.accentRgb;
  const ac = thm.accent;
  const R = radii(cardShape);
  const padH = shapePadding(cardShape);

  const [config, setConfig] = useState<TradeConfig>({
    lotSize: '0.01',
    numberOfTrades: '1'
  });

  const isSymbolActive = mt5Symbols.some(s => s.symbol === symbol);

  // Also check legacy activeSymbols for backward compatibility
  const legacySymbolActive = activeSymbols.some(s => s.symbol === symbol);
  const legacySymbolConfig = activeSymbols.find(s => s.symbol === symbol);

  // Load existing config when symbol changes (initial load only). Only the two
  // editable values are read back — direction and platform are fixed.
  useEffect(() => {
    const loadInitialConfig = () => {
      // Check legacy config first for backward compatibility
      if (legacySymbolConfig) {
        setConfig({
          lotSize: legacySymbolConfig.lotSize,
          numberOfTrades: legacySymbolConfig.numberOfTrades
        });
        return;
      }

      // A symbol saved before MT4 was retired still has its lot size read back.
      const saved = mt5Symbols.find(s => s.symbol === symbol) ?? mt4Symbols.find(s => s.symbol === symbol);
      setConfig(saved
        ? { lotSize: saved.lotSize, numberOfTrades: saved.numberOfTrades }
        : { lotSize: '0.01', numberOfTrades: '1' });
    };

    // Only load initial config when component mounts or symbol changes
    loadInitialConfig();
  }, [symbol, mt4Symbols, mt5Symbols, legacySymbolConfig]);


  /**
   * Push the new symbol list to a bot that is already running.
   *
   * Without this, editing Trade Config changed only what the app displayed:
   * the server kept trading the list it was started with, so a symbol removed
   * here carried on opening trades and a symbol added here was ignored until
   * the bot was stopped and started again.
   *
   * The next list is passed in rather than read from state, because the
   * provider's update has not landed yet at the point this is called.
   */
  const syncRunningBot = useCallback(async (next: { symbol: string; lotSize: string; numberOfTrades: string }[]) => {
    const uuid = mt5Account?.uuid;
    if (!isBotActive || !uuid) return;

    const lot = parseFloat(String(config.lotSize).replace(',', '.'));
    const count = parseInt(String(config.numberOfTrades), 10);
    const params = buildStrategyParams(
      next,
      Number.isFinite(lot) && lot > 0 ? lot : 0.01,
      Number.isFinite(count) && count > 0 ? count : 1,
      eas?.[0]?.name || 'Robot',
    );

    try {
      if (!params) {
        // Nothing configured any more — a running bot with no symbols would
        // just keep whatever it already had open.
        await apiService.stopStrategy(uuid);
        return;
      }
      // startStrategy replaces the flight and flattens the old one first, so the
      // removed symbol is closed rather than left running untracked.
      await apiService.startStrategy(uuid, params);
    } catch (e: any) {
      console.error('[trade-config] could not update the running bot:', e?.message || e);
    }
  }, [isBotActive, mt5Account?.uuid, config.lotSize, config.numberOfTrades, eas]);

  const handleBack = () => {
    router.back();
  };

  const handleSetSymbol = () => {
    if (symbol) {
      // Save to both legacy and separate storage for compatibility
      activateSymbol({
        symbol,
        lotSize: config.lotSize,
        direction: DIRECTION,
        platform: PLATFORM,
        numberOfTrades: config.numberOfTrades
      });

      activateMT5Symbol({
        symbol,
        lotSize: config.lotSize,
        direction: DIRECTION,
        numberOfTrades: config.numberOfTrades
      });
      console.log('MT5 symbol activated:', { symbol, ...config, direction: DIRECTION });

      syncRunningBot([
        ...mt5Symbols.filter(s => s.symbol !== symbol),
        { symbol, lotSize: config.lotSize, numberOfTrades: config.numberOfTrades },
      ]);

      router.back();
    }
  };

  const handleRemoveSymbol = () => {
    if (symbol) {
      // Clear every store. MT4 is included so a symbol saved before MT4 was
      // retired can still be removed from this screen.
      deactivateSymbol(symbol);
      deactivateMT5Symbol(symbol);
      deactivateMT4Symbol(symbol);
      console.log('Symbol deactivated:', symbol);

      syncRunningBot(mt5Symbols.filter(s => s.symbol !== symbol));

      router.back();
    }
  };

  const updateConfig = (key: keyof TradeConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const isActive = isSymbolActive || legacySymbolActive;

  /* Each field is a capsule on the page wash, matching the quote rows it was
     opened from. The label sits outside the capsule so the value inside stays
     the only thing at full weight. */
  const field = (label: string, body: React.ReactNode) => (
    <View style={styles.configSection}>
      <Text style={styles.sectionTitle}>{label}</Text>
      <NeonCard radius={R.row} variant="glass" gloss={false} style={[styles.fieldFace, { paddingHorizontal: padH }]}>
        {body}
      </NeonCard>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && ({ backgroundImage: screenWash(a) } as any)]}>
      {/* Header */}
      <View style={styles.headerOuter}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, webPressable]} onPress={handleBack} activeOpacity={0.7}>
            <ArrowLeft color="rgba(255,255,255,0.8)" size={20} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: ac }]}>TRADE CONFIG</Text>
            <Text style={styles.symbolText}>
              {symbol}
              <Text style={{ color: INK.ghost }}>{'  ·  ' + PLATFORM + '  ·  '}</Text>
              <Text style={{ color: SIGNAL.both }}>{DIRECTION}</Text>
              <Text style={{ color: isActive ? SIGNAL.live : INK.ghost }}>{isActive ? '  ·  LIVE' : '  ·  IDLE'}</Text>
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {field('LOT SIZE', (
            <TextInput
              style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              value={config.lotSize}
              onChangeText={(value) => updateConfig('lotSize', value)}
              keyboardType="decimal-pad"
              placeholder="0.01"
              placeholderTextColor={INK.ghost}
            />
          ))}

          {field('NUMBER OF TRADES', (
            <TextInput
              style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
              value={config.numberOfTrades}
              onChangeText={(value) => updateConfig('numberOfTrades', value)}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={INK.ghost}
            />
          ))}

          {/* Action buttons — the primary CTA is the one live element on the
              screen, so it gets the spinning rim. */}
          <View style={styles.buttonContainer}>
            <NeonCard radius={R.row} ring onPress={handleSetSymbol} style={styles.executeFace}>
              <Text style={[styles.executeButtonText, { color: ac }]}>
                {isActive ? 'UPDATE SYMBOL' : 'SET SYMBOL'}
              </Text>
            </NeonCard>

            {isActive && (
              <TouchableOpacity style={[styles.removeButton, webPressable, { borderRadius: R.row }]} onPress={handleRemoveSymbol} activeOpacity={0.7}>
                <Trash2 color={SIGNAL.sell} size={18} />
                <Text style={styles.removeButtonText}>REMOVE</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  keyboardAvoidingView: { flex: 1 },

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
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 1.5 },
  symbolText: { color: INK.secondary, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginTop: 3 },

  content: { flex: 1, paddingHorizontal: 20, zIndex: 10 },
  scrollContent: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingTop: 12, paddingBottom: 40 },

  configSection: { marginBottom: 20 },
  sectionTitle: { ...GROUP_LABEL, marginBottom: 10, marginLeft: 16 },
  fieldFace: { paddingVertical: 4, justifyContent: 'center', minHeight: 58 },
  input: {
    color: INK.primary, fontSize: 16, fontWeight: '600',
    paddingVertical: 14, backgroundColor: 'transparent', borderWidth: 0,
  },
  buttonContainer: { marginTop: 28, marginBottom: 32, gap: 12 },
  executeFace: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  executeButtonText: { fontSize: 15, fontWeight: '700', letterSpacing: 1.2, zIndex: 5 },
  removeButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderWidth: 1, borderColor: 'rgba(255, 69, 58, 0.35)',
    paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  removeButtonText: { color: SIGNAL.sell, fontSize: 14, fontWeight: '700', letterSpacing: 1.2 },
});