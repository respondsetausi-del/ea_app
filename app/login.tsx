import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Linking, Platform, KeyboardAvoidingView, ScrollView, Animated, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CandleLogo } from '@/components/candle-logo';
import { FloatingField } from '@/components/floating-field';
// Networking disabled: avoid external browser/payment flows
import { useApp } from '@/providers/app-provider';
import { useTheme } from '@/providers/theme-provider';
import { apiService } from '@/services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Stripe Payment Link (no-code). Override with EXPO_PUBLIC_STRIPE_BUY_URL at
// build time; falls back to the current link (a public URL, safe to embed).
// The link's post-payment redirect must point to <app origin>/paid.
const STRIPE_BUY_URL =
  process.env.EXPO_PUBLIC_STRIPE_BUY_URL || 'https://buy.stripe.com/dRm14n16e13nf0G19Re3e0U';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [paymentVisible, setPaymentVisible] = useState<boolean>(false);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [reactivateVisible, setReactivateVisible] = useState<boolean>(false);
  const { setUser, user, eas } = useApp();
  const { theme } = useTheme();
  const a = theme.accentRgb;
  const ac = theme.accent;

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Navigation guard — if already authenticated, skip login entirely.
  // Prevents someone navigating back to /login to re-enter different credentials.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const authenticated = await AsyncStorage.getItem('emailAuthenticated');
        if (cancelled) return;
        if (authenticated === 'true' || user) {
          if (eas.length > 0) {
            router.replace('/(tabs)');
          } else {
            router.replace('/license');
          }
        }
      } catch {
        // ignore — worst case we show the login form
      }
    })();
    return () => { cancelled = true; };
  }, [user, eas.length]);

  const handleProceed = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const trimmedEmail = email.trim();
      const account = await apiService.authenticate({ email: trimmedEmail });

      if (account.status !== 'ok') {
        // A mentor has added them and payment is already recorded — the only
        // thing left is the super admin's approval. Don't charge them twice.
        if (account.approvalStatus === 'pending' && account.paid) {
          setModalTitle('Awaiting approval');
          setModalMessage('We have your payment. Your access is being reviewed and will be enabled shortly.');
          setModalVisible(true);
          return;
        }
        if (account.approvalStatus === 'rejected') {
          setModalTitle('Access declined');
          setModalMessage('This account was not approved. Please contact your mentor.');
          setModalVisible(true);
          return;
        }
        // Payment switched off by the super admin → approval is the only gate,
        // so never show checkout; just tell them where they stand.
        if (account.requirePayment === false) {
          setModalTitle(account.approvalStatus === 'pending' ? 'Awaiting approval' : 'No access yet');
          setModalMessage(
            account.approvalStatus === 'pending'
              ? 'Your access is being reviewed and will be enabled shortly.'
              : 'Ask your mentor to add this email address, then try again.'
          );
          setModalVisible(true);
          return;
        }
        // Pending-but-unpaid, or nobody has added them yet → take payment.
        await handleBuy();
        return;
      }

      // Authenticated — persist and move to the license step.
      await AsyncStorage.setItem('emailAuthenticated', 'true');
      setUser({ email: account.email });
      router.push('/license');
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Opens the Stripe Payment Link for this email. Native shows it in the
  // in-app modal; web redirects the page (Stripe blocks iframing).
  const handleBuy = async () => {
    const em = email.trim();
    if (!em) { Alert.alert('Error', 'Enter your email first'); return; }
    if (!em.includes('@')) { Alert.alert('Error', 'Please enter a valid email address'); return; }
    if (!STRIPE_BUY_URL) { Alert.alert('Unavailable', 'Payments are not set up yet. Please contact your provider.'); return; }
    const url = `${STRIPE_BUY_URL}?prefilled_email=${encodeURIComponent(em)}`;
    try { await AsyncStorage.setItem('pendingBuy', JSON.stringify({ email: em })); } catch {}
    if (Platform.OS === 'web') {
      (window as any).location.href = url;
    } else {
      setPaymentUrl(url);
      setPaymentVisible(true);
    }
  };

  // Runs when the payment WebView reaches the /paid success URL.
  const finishPaid = async () => {
    const em = email.trim();
    try { await AsyncStorage.setItem('emailAuthenticated', 'true'); } catch {}
    setPaymentVisible(false);
    setUser({ email: em });
    router.replace('/license');
  };

  const handlePaymentFlow = async () => {
    setIsPaymentProcessing(false);
    Alert.alert('Offline mode', 'Payments are disabled. Continuing locally.');
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        Platform.OS === 'web' && {
          backgroundImage:
            'linear-gradient(135deg, rgba(' + a + ', 0.95) 0%, rgba(' + a + ', 0.7) 20%, rgba(' + a + ', 0.4) 40%, rgba(' + a + ', 0.2) 60%, rgba(' + a + ', 0.1) 80%, rgba(0, 0, 0, 0.8) 95%, rgba(0, 0, 0, 1) 100%)',
        },
      ]}
    >
      {/* Ambient gradient orbs */}
      <Animated.View style={[styles.orbTop, { opacity: glowAnim, backgroundColor: 'rgba(' + a + ', 0.12)' }]} />
      <Animated.View style={[styles.orbBottom, { opacity: glowAnim, backgroundColor: 'rgba(' + a + ', 0.08)' }]} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Logo */}
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
              <View style={[styles.iconGlow, { backgroundColor: '#050505', shadowColor: ac, alignItems: 'center', justifyContent: 'center' }]}>
                <CandleLogo size={72} color={ac} />
              </View>
              <Text style={styles.appName}>EA NAPTUNE</Text>
              <Text style={styles.tagline}>Algorithmic Trading Platform</Text>
            </Animated.View>

            {/* Form sits directly on the gradient — no card. */}
            <View style={styles.formBlock}>
              <Text style={styles.welcomeText}>Welcome Back</Text>

              <FloatingField
                testID="login-email"
                label="Email"
                value={email}
                onChangeText={setEmail}
                accentRgb={a}
                keyboardType="email-address"
              />

              <TouchableOpacity
                style={[styles.proceedButton, (isLoading || isPaymentProcessing) && styles.proceedButtonDisabled, { backgroundColor: 'rgba(' + a + ', 0.85)', shadowColor: ac }]}
                onPress={handleProceed}
                disabled={isLoading || isPaymentProcessing}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.proceedButtonText}>Verifying...</Text>
                  </View>
                ) : isPaymentProcessing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.proceedButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.proceedButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>Powered by EA NAPTUNE</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Alert Modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconRow}>
              <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(' + a + ', 0.15)', borderColor: 'rgba(' + a + ', 0.3)' }]}>
                <Text style={[styles.modalIconText, { color: ac }]}>!</Text>
              </View>
            </View>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Dismiss</Text>
            </TouchableOpacity>
            {modalTitle === 'Email Already Used' && (
              <TouchableOpacity
                style={[styles.reactivateButton, { backgroundColor: 'rgba(' + a + ', 0.85)', shadowColor: ac }]}
                onPress={() => {
                  setModalVisible(false);
                  setReactivateVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.reactivateButtonText}>Reactivate Account</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Payment Modal */}
      {paymentVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.paymentModal]}>
            <View style={styles.paymentHeader}>
              <Text style={styles.modalTitle}>Complete Payment</Text>
              <TouchableOpacity
                onPress={() => setPaymentVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'web' ? (
              <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                <iframe
                  src={paymentUrl}
                  style={{ width: '100%', height: '100%', border: '0' }}
                  loading="eager"
                  allow="payment *; clipboard-write;"
                />
              </View>
            ) : (
              <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                <WebView
                  source={{ uri: paymentUrl }}
                  startInLoadingState
                  onNavigationStateChange={(navState) => {
                    if (navState.url && navState.url.includes('/paid')) { finishPaid(); }
                  }}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Reactivate Account Modal */}
      {reactivateVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.paymentModal]}>
            <View style={styles.paymentHeader}>
              <Text style={styles.modalTitle}>Reactivate Account</Text>
              <TouchableOpacity
                onPress={() => setReactivateVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {Platform.OS === 'web' ? (
              <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                <iframe
                  src="https://tradeportea.com/admin/home/activate_email.php"
                  style={{ width: '100%', height: '100%', border: '0' }}
                  loading="eager"
                />
              </View>
            ) : (
              <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
                <WebView source={{ uri: 'https://tradeportea.com/admin/home/activate_email.php' }} startInLoadingState />
              </View>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  orbTop: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.15,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(255, 26, 26, 0.12)',
    ...(Platform.OS === 'web' && { filter: 'blur(80px)' }),
  },
  orbBottom: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT * 0.1,
    left: -SCREEN_WIDTH * 0.3,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: 'rgba(255, 26, 26, 0.08)',
    ...(Platform.OS === 'web' && { filter: 'blur(100px)' }),
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconGlow: {
    padding: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 26, 26, 0.08)',
    shadowColor: '#FF1A1A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 6,
    letterSpacing: 0.8,
  },
  formBlock: {
    width: '100%',
    maxWidth: 360,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 28,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  proceedButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 26, 26, 0.85)',
    shadowColor: '#FF1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 32,
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: 0.5,
  },
  buyButton: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 28,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 20,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(60px)',
      WebkitBackdropFilter: 'blur(60px)',
    }),
  },
  modalIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 26, 26, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 26, 26, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconText: {
    color: '#FF4D4D',
    fontSize: 20,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  paymentModal: {
    maxWidth: 800,
    height: '80%',
    padding: 20,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  reactivateButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: 'rgba(255, 26, 26, 0.85)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  reactivateButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
