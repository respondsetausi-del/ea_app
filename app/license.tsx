import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/providers/app-provider';
import { useTheme } from '@/providers/theme-provider';
import { CandleLogo } from '@/components/candle-logo';
import { FloatingField } from '@/components/floating-field';
import { apiService } from '@/services/api';

export default function LicenseScreen() {
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const { addEA, eas, user, isFirstTime } = useApp();
  const { theme: thm } = useTheme();
  const a = thm.accentRgb;
  const ac = thm.accent;
  const hasActiveBots = eas.length > 0;
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');

  useEffect(() => {
    if (!isFirstTime && !user && !hasActiveBots) {
      router.replace('/login');
    }
  }, [user, isFirstTime, hasActiveBots]);

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      Alert.alert('Error', 'Please enter a valid license key');
      return;
    }
    const existingEA = eas.find(ea => ea.licenseKey.toLowerCase().trim() === licenseKey.trim().toLowerCase());
    if (existingEA) {
      setModalTitle('License Already Added');
      setModalMessage('This license key is already added on this device.');
      setModalVisible(true);
      return;
    }
    setIsActivating(true);
    try {
      const authResponse = await apiService.authenticateLicense({ licence: licenseKey.trim(), email: user?.email || '' });
      if (authResponse.message === 'used') {
        setModalTitle('License Already Used');
        setModalMessage('This license key is bound to another device. Please contact support.');
        setModalVisible(true);
        return;
      }
      if (authResponse.message !== 'accept' || !authResponse.data) {
        setModalTitle('Invalid License');
        setModalMessage('The license key does not exist or authentication failed.');
        setModalVisible(true);
        return;
      }
      const data = authResponse.data;
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substr(2, 9);
      const keyHash = licenseKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueId = `ea_${timestamp}_${randomPart}_${keyHash}`;
      const newEA = {
        id: uniqueId, name: data.ea_name || 'EA NAPTUNE', licenseKey: licenseKey.trim(),
        status: 'connected' as const, description: (data.owner?.name) || 'EA NAPTUNE',
        phoneSecretKey: data.phone_secret_key, userData: data,
      };
      const success = await addEA(newEA);
      if (success) { await new Promise(r => setTimeout(r, 300)); router.replace('/(tabs)'); }
      else { Alert.alert('Error', 'Failed to save this license locally.'); }
    } catch (error) {
      console.error('License activation error:', error);
      Alert.alert('Network Error', 'Failed to reach the server. Please try again.');
    } finally { setIsActivating(false); }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        Platform.OS === 'web' && {
          // Same gradient as the splash and login screens, so the three read as
          // one continuous flow rather than three different products.
          backgroundImage:
            'linear-gradient(135deg, rgba(' + a + ', 0.95) 0%, rgba(' + a + ', 0.7) 20%, rgba(' + a + ', 0.4) 40%, rgba(' + a + ', 0.2) 60%, rgba(' + a + ', 0.1) 80%, rgba(0, 0, 0, 0.8) 95%, rgba(0, 0, 0, 1) 100%)',
        },
      ]}
    >
      {hasActiveBots && (
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, Platform.OS === 'web' && { backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }]} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Same masthead as login: glowing logo tile, name, tagline. */}
            <View style={styles.logoContainer}>
              <View style={[styles.iconGlow, { shadowColor: ac }]}>
                <CandleLogo size={72} color={ac} />
              </View>
              <Text style={styles.appName}>EA NAPTUNE</Text>
              <Text style={styles.tagline}>Algorithmic Trading Platform</Text>
            </View>

            {/* No card — the form sits directly on the gradient, as on login. */}
            <View style={styles.formBlock}>
              <Text style={styles.headingText}>Enter License Key</Text>

              <FloatingField
                testID="license-key"
                label="License Key"
                value={licenseKey}
                onChangeText={setLicenseKey}
                accentRgb={a}
                autoCapitalize="characters"
              />

              <TouchableOpacity
                style={[
                  styles.activateButton,
                  isActivating && styles.activateButtonDisabled,
                  { backgroundColor: 'rgba(' + a + ', 0.85)', shadowColor: ac },
                ]}
                onPress={handleActivate}
                disabled={isActivating}
                activeOpacity={0.8}
              >
                {isActivating ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.btnText, { marginLeft: 8 }]}>Activating...</Text>
                  </View>
                ) : (
                  <Text style={styles.btnText}>Activate EA</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.hint}>Enter your license key to activate EA</Text>
            </View>

            <Text style={styles.footer}>Powered by EA NAPTUNE</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Platform.OS === 'web' && { background: 'radial-gradient(ellipse 120% 50% at 20% 20%, rgba(255,255,255,0.15) 0%, transparent 70%), linear-gradient(180deg, rgba(44,44,46,0.85) 0%, rgba(28,28,30,0.95) 100%)', backdropFilter: 'blur(80px) saturate(200%)', WebkitBackdropFilter: 'blur(80px) saturate(200%)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.25), 0 24px 80px rgba(0,0,0,0.6)' }]}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalMsg}>{modalMessage}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalBtnTxt, { color: ac }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  backButton: {
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  iconGlow: {
    padding: 4,
    borderRadius: 24,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
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
  formBlock: { width: '100%', maxWidth: 360 },
  headingText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 28,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  activateButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  activateButtonDisabled: { opacity: 0.5 },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    marginTop: 14,
  },
  footer: {
    marginTop: 32,
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 9999,
  },
  modalCard: {
    width: '100%', maxWidth: 340, borderRadius: 24, padding: 24,
    backgroundColor: 'rgba(44, 44, 46, 0.92)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.6, shadowRadius: 32, elevation: 20 }),
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 10, textAlign: 'center' },
  modalMsg: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  modalBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  modalBtnTxt: { fontSize: 17, fontWeight: '600' },
});
