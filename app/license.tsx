import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useApp } from '@/providers/app-provider';
import { useTheme } from '@/providers/theme-provider';
import { PageBackground } from '@/components/page-background';
import { apiService } from '@/services/api';

export default function LicenseScreen() {
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const { addEA, eas, user, isFirstTime } = useApp();
  const { theme: thm, glassMode } = useTheme();
  const a = thm.accentRgb;
  const ac = thm.accent;
  const isNeon = glassMode === 'neon';
  const isLiquid = glassMode === 'liquid';
  const isCmd = glassMode === 'commander';
  const hasActiveBots = eas.length > 0;
  const primaryEA = eas.length > 0 ? eas[0] : null;
  const primaryEAImage = (() => {
    if (!primaryEA || !primaryEA.userData || !primaryEA.userData.owner) return null;
    const raw = (primaryEA.userData.owner.logo || '').toString().trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://tradeportea.com/admin/uploads/' + raw.replace(/^\/+/, '');
  })();
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
      const authResponse = await apiService.authenticateLicense({ licence: licenseKey.trim() });
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
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { backgroundImage: isNeon ? 'linear-gradient(135deg, rgba(' + a + ', 0.7) 0%, rgba(' + a + ', 0.3) 25%, rgba(0,0,0,0.85) 55%, #000 100%)' : isLiquid ? 'linear-gradient(160deg, #1a1a1e 0%, #111113 40%, #0a0a0c 100%)' : 'linear-gradient(170deg, rgba(' + a + ', 0.06) 0%, #050505 40%, #000 100%)' }]}>
      <PageBackground eaImage={primaryEAImage} />
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
            <View style={styles.logoContainer}>
              <Image source={require('@/assets/images/icon.png')} style={styles.appIcon} resizeMode="contain" />
              <Text style={styles.title}>Enter License Key</Text>
            </View>
            <View style={styles.form}>
              <View style={[styles.inputWrap, Platform.OS === 'web' && (isNeon ? { background: 'radial-gradient(ellipse 120% 50% at 20% 20%, rgba(255,255,255,0.1) 0%, transparent 70%), linear-gradient(180deg, rgba(' + a + ', 0.04) 0%, rgba(0,0,0,0.6) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)' } : isLiquid ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.4) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', border: '1.5px solid rgba(' + a + ', 0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 8px rgba(' + a + ', 0.5), 0 0 20px rgba(' + a + ', 0.35), 0 0 40px rgba(' + a + ', 0.2)' } : isCmd ? { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '2px solid ' + ac, boxShadow: '0 0 12px rgba(' + a + ', 0.35), 0 0 24px rgba(' + a + ', 0.2), 0 8px 20px rgba(0,0,0,0.5)' } : { background: 'rgba(16,16,18,0.97)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '0.5px solid rgba(255,255,255,0.04)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.1), 0 0 28px rgba(' + a + ', 0.35), 0 0 56px rgba(' + a + ', 0.15)' })]}>
                <TextInput style={styles.input} placeholder="License Key" placeholderTextColor="rgba(255,255,255,0.35)" value={licenseKey} onChangeText={setLicenseKey} autoCapitalize="characters" />
              </View>
              <TouchableOpacity
                style={[styles.activateButton, isActivating && styles.activateButtonDisabled, Platform.OS === 'web' && (isNeon ? { background: 'radial-gradient(ellipse 120% 50% at 30% 25%, rgba(255,255,255,0.15) 0%, transparent 70%), linear-gradient(180deg, rgba(' + a + ', 0.15) 0%, rgba(' + a + ', 0.08) 50%, rgba(0,0,0,0.5) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.25), 0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(' + a + ', 0.1)' } : isLiquid ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.4) 100%)', backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)', border: '1.5px solid rgba(' + a + ', 0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 0 8px rgba(' + a + ', 0.5), 0 0 20px rgba(' + a + ', 0.35), 0 0 40px rgba(' + a + ', 0.2), 0 0 70px rgba(' + a + ', 0.1)' } : isCmd ? { background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '2px solid ' + ac, boxShadow: '0 0 12px rgba(' + a + ', 0.35), 0 0 24px rgba(' + a + ', 0.2), 0 8px 20px rgba(0,0,0,0.5)' } : { background: 'rgba(16,16,18,0.97)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '0.5px solid rgba(255,255,255,0.04)', boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.1), 0 0 28px rgba(' + a + ', 0.35), 0 0 56px rgba(' + a + ', 0.15)' })]}
                onPress={handleActivate} disabled={isActivating}>
                {isActivating ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color={ac} />
                    <Text style={[styles.btnText, { marginLeft: 10 }]}>Activating...</Text>
                  </View>
                ) : (
                  <Text style={styles.btnText}>Activate EA</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.hint}>Enter your license key to activate EA</Text>
            </View>
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 60 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 16, letterSpacing: -0.3 },
  form: { width: '100%', maxWidth: 340 },
  inputWrap: {
    borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(44, 44, 46, 0.6)', marginBottom: 16,
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 4 }),
  },
  input: { paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: '#FFFFFF', backgroundColor: 'transparent' },
  activateButton: {
    backgroundColor: 'rgba(44, 44, 46, 0.7)', paddingVertical: 18,
    borderRadius: 18, marginTop: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 }),
  },
  activateButtonDisabled: { opacity: 0.5 },
  btnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600', textAlign: 'center', letterSpacing: -0.2 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 14 },
  appIcon: { width: 80, height: 80, borderRadius: 18 },
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
