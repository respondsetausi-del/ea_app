import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { X, Zap } from 'lucide-react-native';
import { apiService } from '@/services/api';
import { NeonModal, NeonModalButton } from '@/components/neon-modal';
import { INK } from '@/constants/neon';

export interface QuickConfig {
  symbol: string;
  lotSize: string;
  numberOfTrades: string;
}

interface Props {
  visible: boolean;
  uuid: string | undefined;
  accent?: string;
  onClose: () => void;
  onConfirm: (config: QuickConfig) => void;
}

// Quick trade setup shown when Start is pressed with no configured symbol.
// Pulls the broker's symbols from the connected account, set lot + number of
// trades, then Confirm — the first trades are placed immediately.
export default function QuickConfigModal({ visible, uuid, accent = '#22C55E', onClose, onConfirm }: Props) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('');
  const [lot, setLot] = useState('');
  const [trades, setTrades] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (visible && uuid && symbols.length === 0) {
      setLoading(true);
      setError(null);
      apiService.getMT5Symbols(uuid)
        .then((s) => { if (!cancelled) setSymbols(Array.isArray(s) ? s : []); })
        .catch((e) => { if (!cancelled) setError(e?.message || 'Could not load broker symbols'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, uuid]);

  const q = symbol.trim().toUpperCase();
  const matches = (q ? symbols.filter(s => s.toUpperCase().includes(q)) : symbols).slice(0, 30);
  const canStart = !!symbol.trim();

  const save = () => {
    if (!canStart) return;
    onConfirm({ symbol: symbol.trim(), lotSize: (lot.trim() || '0.01'), numberOfTrades: (trades.trim() || '1') });
  };

  return (
    <NeonModal visible={visible} onClose={onClose} maxWidth={460} dismissOnBackdrop={false}>
      <View style={styles.body}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Zap color={accent} size={18} strokeWidth={2.5} />
              <Text style={[styles.title, { color: accent }]}>QUICK TRADE SETUP</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X color="#9CA3AF" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Pick a broker symbol and set your lot &amp; number of trades — it confirms and trades immediately.</Text>

          <TextInput
            style={[styles.input, { borderColor: accent + '99' }]}
            placeholder={loading ? 'Loading broker symbols…' : 'Search & pick a symbol'}
            placeholderTextColor="#6B7280"
            autoCapitalize="characters"
            autoCorrect={false}
            value={symbol}
            onChangeText={setSymbol}
          />

          {loading && <ActivityIndicator color={accent} style={{ marginVertical: 6 }} />}
          {error && <Text style={styles.error}>{error} — you can still type a symbol manually.</Text>}

          {symbols.length > 0 && (
            <ScrollView style={{ maxHeight: 132 }} keyboardShouldPersistTaps="handled">
              <View style={styles.chips}>
                {matches.map(s => {
                  const sel = symbol.trim().toUpperCase() === s.toUpperCase();
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.chip, { borderColor: accent + '55' }, sel && { backgroundColor: accent + '22', borderColor: accent }]}
                      onPress={() => setSymbol(s)}
                    >
                      <Text style={[styles.chipText, { color: accent }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, minWidth: 0 }]} placeholder="Lot (0.01)" placeholderTextColor="#6B7280" keyboardType="decimal-pad" value={lot} onChangeText={setLot} />
            <TextInput style={[styles.input, { flex: 1, minWidth: 0 }]} placeholder="Trades (1)" placeholderTextColor="#6B7280" keyboardType="number-pad" value={trades} onChangeText={setTrades} />
          </View>

          <NeonModalButton label="CONFIRM & TRADE" disabled={!canStart} onPress={save} />
          <Text style={styles.footnote}>Defaults to 0.01 lot · 1 trade. First trades are placed immediately.</Text>
      </View>
    </NeonModal>
  );
}

const styles = StyleSheet.create({
  /* The surface, rim and padding come from NeonModal; this is just the body. */
  body: { width: '100%', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  hint: { color: INK.secondary, fontSize: 12, lineHeight: 17 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 13, color: '#FFFFFF',
    fontSize: 14, fontWeight: '600', minWidth: 0,
    ...(Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)),
  },
  error: { color: '#FF453A', fontSize: 11 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.04)' },
  chipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  row: { flexDirection: 'row', gap: 10 },
  footnote: { color: INK.ghost, fontSize: 10, textAlign: 'center' },
});
