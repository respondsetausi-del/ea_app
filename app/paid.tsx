import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/providers/app-provider';
import { apiService } from '@/services/api';
import { CandleLogo } from '@/components/candle-logo';

const ACCENT = '#0A84FF';

// How long to wait for Stripe's webhook. The redirect and the webhook are
// independent, so the buyer routinely gets here first; a few seconds of
// polling is the difference between activating them and asking them for a key
// they don't have.
const CLAIM_ATTEMPTS = 8;
const CLAIM_INTERVAL_MS = 2000;

/**
 * Stripe redirects here after a successful Payment Link checkout.
 *
 * Payment issues a licence key server-side, so this screen claims it with the
 * Checkout Session id and activates the bot outright. Previously it just
 * bounced to the licence screen, where the buyer was asked to type a key that
 * had never been generated or sent — every paid signup dead-ended on "Invalid
 * License". Falling back to that screen is still correct when there's no
 * session id to claim with (older links, or a manual visit).
 */
export default function PaidScreen() {
  const { setUser, addEA } = useApp();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const [status, setStatus] = useState('Confirming your payment…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let email = '';
      try {
        const raw = await AsyncStorage.getItem('pendingBuy');
        if (raw) {
          email = JSON.parse(raw)?.email || '';
          if (email) {
            await AsyncStorage.setItem('emailAuthenticated', 'true');
            setUser({ email });
          }
          await AsyncStorage.removeItem('pendingBuy');
        }
      } catch {}

      // Expo Router gives us the query on web; fall back to the raw URL in case
      // this screen is reached without the router parsing params.
      let sessionId = (params.session_id || '').toString();
      if (!sessionId && Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          sessionId = new URLSearchParams(window.location.search).get('session_id') || '';
        } catch {}
      }

      if (!sessionId) {
        setTimeout(() => { if (!cancelled) router.replace('/license'); }, 1200);
        return;
      }

      for (let attempt = 0; attempt < CLAIM_ATTEMPTS; attempt++) {
        if (cancelled) return;
        const claim = await apiService.claimLicense(sessionId);
        if (cancelled) return;

        if (claim.claimed && claim.license_key) {
          const activeEmail = claim.email || email;
          setStatus('Activating your bot…');
          if (activeEmail) {
            await AsyncStorage.setItem('emailAuthenticated', 'true');
            setUser({ email: activeEmail });
          }

          const auth = await apiService.authenticateLicense({
            licence: claim.license_key,
            email: activeEmail,
          });
          if (cancelled) return;

          if (auth.message === 'accept' && auth.data) {
            const d = auth.data;
            const ok = await addEA({
              id: `ea_${Date.now()}_${Math.random().toString(36).slice(2, 11)}_${claim.license_key.toLowerCase()}`,
              name: d.ea_name || 'EA NAPTUNE',
              licenseKey: claim.license_key,
              status: 'connected' as const,
              description: d.owner?.name || 'EA NAPTUNE',
              phoneSecretKey: d.phone_secret_key,
              userData: d,
            });
            if (cancelled) return;
            if (ok) {
              setStatus('Ready.');
              router.replace('/(tabs)');
              return;
            }
          }
          // Key is good but the bot wouldn't attach — the licence screen shows
          // the real reason, and the key is already on the account.
          router.replace('/license');
          return;
        }

        if (!claim.pending) break;   // a settled "no" — stop polling
        setStatus('Waiting for Stripe to confirm…');
        await new Promise(r => setTimeout(r, CLAIM_INTERVAL_MS));
      }

      if (!cancelled) router.replace('/license');
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.tile}>
        <CandleLogo size={72} color={ACCENT} />
      </View>
      <Text style={styles.title}>Payment Complete</Text>
      <Text style={styles.sub}>{status}</Text>
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
