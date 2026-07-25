import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/providers/app-provider';
import { apiService } from '@/services/api';
import { CandleLogo } from '@/components/candle-logo';

const ACCENT = '#0A84FF';

// Stripe redirects here after a successful Payment Link checkout (web). We
// restore the buyer's email + Mentor ID (stashed before redirect) and send
// them on to the license step.
export default function PaidScreen() {
  const { setUser } = useApp();

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('pendingBuy');
        if (raw) {
          const { email, mentorId } = JSON.parse(raw);
          // Auto-register the paid user under the mentor's EA.
          try { await apiService.registerUser(email, mentorId); } catch {}
          await AsyncStorage.setItem('emailAuthenticated', 'true');
          setUser({ mentorId, email });
          await AsyncStorage.removeItem('pendingBuy');
        }
      } catch {}
      setTimeout(() => router.replace('/license'), 1200);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.tile}>
        <CandleLogo size={72} color={ACCENT} />
      </View>
      <Text style={styles.title}>Payment Complete</Text>
      <Text style={styles.sub}>Taking you to activation…</Text>
      <ActivityIndicator color={ACCENT} style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...(Platform.OS === 'web' && {
      backgroundImage: 'linear-gradient(135deg, rgba(10,132,255,0.15) 0%, #050505 50%, #000 100%)',
    }),
  },
  tile: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#0A0E14',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && { boxShadow: '0 0 26px rgba(10,132,255,0.5)' }),
  },
  title: { fontSize: 24, fontWeight: '800', color: ACCENT, marginTop: 24, letterSpacing: 1 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 },
});
