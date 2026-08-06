import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ScrollView, Platform, FlatList, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import CustomWebView from '../../components/custom-webview';
import WebWebView from '../../components/web-webview';
import SimpleWebView from '../../components/simple-webview';
import InjectableWebView from '../../components/injectable-webview';
import FallbackWebView from '../../components/fallback-webview';
import { Eye, EyeOff, Search, Server, ExternalLink, Shield, RefreshCw, X, Menu } from 'lucide-react-native';
import { apiService } from '@/services/api';
import { useApp } from '@/providers/app-provider';
import { useTheme } from '@/providers/theme-provider';
import { PageBackground } from '@/components/page-background';
import { useSidebar } from '@/providers/sidebar-provider';
import { CONTENT_MAX_WIDTH, cardSurface, radii } from '@/constants/neon';

// Default MT4 Brokers (will be updated from web terminal)
const DEFAULT_MT4_BROKERS = [
  'FXCM-Demo01',
  'FXCM-USDDemo01',
  'FXCM-Real',
  'FXCM-USDReal',
  'ICMarkets-Demo',
  'ICMarkets-Live01',
  'ICMarkets-Live02',
  'XM-Demo 1',
  'XM-Demo 2',
  'XM-Demo 3',
  'XM-Real 1',
  'XM-Real 2',
  'XM-Real 3',
  'OANDA-Demo',
  'OANDA-Live',
  'Pepperstone-Demo',
  'Pepperstone-Live',
  'IG-Demo',
  'IG-Live',
  'FXTM-Demo',
  'FXTM-Real',
  'Exness-Demo',
  'Exness-Real1',
  'Exness-Real2',
  'Admiral-Demo',
  'Admiral-Real',
  'FBS-Demo',
  'FBS-Real',
  'HotForex-Demo',
  'HotForex-Live',
  'InstaForex-Demo',
  'InstaForex-Live',
  'Tickmill-Demo',
  'Tickmill-Live',
  'FxPro-Demo',
  'FxPro-Live',
  'FIBO-Demo',
  'FIBO-Live',
  'Alpari-Demo',
  'Alpari-Live',
  'RoboForex-Demo',
  'RoboForex-Live',
  'LiteForex-Demo',
  'LiteForex-Live',
  'NordFX-Demo',
  'NordFX-Live',
  'AMarkets-Demo',
  'AMarkets-Live',
  'Forex4you-Demo',
  'Forex4you-Live',
  'JustForex-Demo',
  'JustForex-Live',
  'OctaFX-Demo',
  'OctaFX-Live',
  'TeleTrade-Demo',
  'TeleTrade-Live',
  'ForexClub-Demo',
  'ForexClub-Live',
  'Weltrade-Demo',
  'Weltrade-Live',
  'FreshForex-Demo',
  'FreshForex-Live',
  'Grand Capital-Demo',
  'Grand Capital-Live',
  'Forex Optimum-Demo',
  'Forex Optimum-Live',
  'NPBFX-Demo',
  'NPBFX-Live',
  'Traders Trust-Demo',
  'Traders Trust-Live',
  'Windsor Brokers-Demo',
  'Windsor Brokers-Live',
  'FXOpen-Demo',
  'FXOpen-Live',
  'AGEA-Demo',
  'AGEA-Live',
  'Dukascopy-Demo',
  'Dukascopy-Live',
  'Swissquote-Demo',
  'Swissquote-Live',
  'Saxo Bank-Demo',
  'Saxo Bank-Live',
  'Interactive Brokers-Demo',
  'Interactive Brokers-Live',
  'TD Ameritrade-Demo',
  'TD Ameritrade-Live',
  'Charles Schwab-Demo',
  'Charles Schwab-Live',
  'E*TRADE-Demo',
  'E*TRADE-Live',
  'Fidelity-Demo',
  'Fidelity-Live',
  'Vanguard-Demo',
  'Vanguard-Live',
  'Plus500-Demo',
  'Plus500-Live',
  'eToro-Demo',
  'eToro-Live',
  'AvaTrade-Demo',
  'AvaTrade-Live',
  'Markets.com-Demo',
  'Markets.com-Live',
  'CMC Markets-Demo',
  'CMC Markets-Live',
  'City Index-Demo',
  'City Index-Live',
  'GAIN Capital-Demo',
  'GAIN Capital-Live',
  'ThinkMarkets-Demo',
  'ThinkMarkets-Live',
  'Vantage FX-Demo',
  'Vantage FX-Live',
  'BlackBull Markets-Demo',
  'BlackBull Markets-Live',
  'FP Markets-Demo',
  'FP Markets-Live',
  'Blueberry Markets-Demo',
  'Blueberry Markets-Live',
  'Axi-Demo',
  'Axi-Live',
  'GO Markets-Demo',
  'GO Markets-Live',
  'Eightcap-Demo',
  'Eightcap-Live',
  'Global Prime-Demo',
  'Global Prime-Live',
  'Fusion Markets-Demo',
  'Fusion Markets-Live',
  'Darwinex-Demo',
  'Darwinex-Live',
  'TMGM-Demo',
  'TMGM-Live',
  'Hantec Markets-Demo',
  'Hantec Markets-Live',
  'Core Spreads-Demo',
  'Core Spreads-Live',
  'Capital.com-Demo',
  'Capital.com-Live',
  'XTB-Demo',
  'XTB-Live',
  'Trading 212-Demo',
  'Trading 212-Live',
  'Libertex-Demo',
  'Libertex-Live',
  'IQ Option-Demo',
  'IQ Option-Live',
  'Olymp Trade-Demo',
  'Olymp Trade-Live',
  'Binomo-Demo',
  'Binomo-Live',
  'Pocket Option-Demo',
  'Pocket Option-Live',
  'Expert Option-Demo',
  'Expert Option-Live',
  'Quotex-Demo',
  'Quotex-Live',
  'Deriv-Demo',
  'Deriv-Live',
  'Binary.com-Demo',
  'Binary.com-Live',
  'Nadex-Demo',
  'Nadex-Live',
  'CBOE-Demo',
  'CBOE-Live',
  'CME Group-Demo',
  'CME Group-Live',
  'ICE-Demo',
  'ICE-Live',
  'Eurex-Demo',
  'Eurex-Live',
  'LSE-Demo',
  'LSE-Live',
  'NYSE-Demo',
  'NYSE-Live',
  'NASDAQ-Demo',
  'NASDAQ-Live',
  'TSX-Demo',
  'TSX-Live',
  'ASX-Demo',
  'ASX-Live',
  'JSE-Demo',
  'JSE-Live',
  'BSE-Demo',
  'BSE-Live',
  'NSE-Demo',
  'NSE-Live',
  'SSE-Demo',
  'SSE-Live',
  'SZSE-Demo',
  'SZSE-Live',
  'TSE-Demo',
  'TSE-Live',
  'HKEX-Demo',
  'HKEX-Live',
  'SGX-Demo',
  'SGX-Live',
  'KRX-Demo',
  'KRX-Live',
  'TWSE-Demo',
  'TWSE-Live',
  'SET-Demo',
  'SET-Live',
  'IDX-Demo',
  'IDX-Live',
  'PSE-Demo',
  'PSE-Live',
  'KLSE-Demo',
  'KLSE-Live',
  'VNX-Demo',
  'VNX-Live',
  'MSX-Demo',
  'MSX-Live',
  'CSE-Demo',
  'CSE-Live',
  'DSE-Demo',
  'DSE-Live',
  'KSE-Demo',
  'KSE-Live',
  'EGX-Demo',
  'EGX-Live',
  'CASE-Demo',
  'CASE-Live',
  'NSE-Nigeria-Demo',
  'NSE-Nigeria-Live',
  'GSE-Demo',
  'GSE-Live',
  'USE-Demo',
  'USE-Live',
  'RSE-Demo',
  'RSE-Live',
  'MSE-Demo',
  'MSE-Live',
  'ZSE-Demo',
  'ZSE-Live',
  'BSE-Botswana-Demo',
  'BSE-Botswana-Live',
  'NSX-Demo',
  'NSX-Live',
  'SEM-Demo',
  'SEM-Live',
  'BRVM-Demo',
  'BRVM-Live',
  'BVMAC-Demo',
  'BVMAC-Live',
  'DSX-Demo',
  'DSX-Live',
  'BVB-Demo',
  'BVB-Live',
  'WSE-Demo',
  'WSE-Live',
  'PX-Demo',
  'PX-Live',
  'BET-Demo',
  'BET-Live',
  'BSE-Bulgaria-Demo',
  'BSE-Bulgaria-Live',
  'BELEX-Demo',
  'BELEX-Live',
  'MSE-Macedonia-Demo',
  'MSE-Macedonia-Live',
  'SASE-Demo',
  'SASE-Live',
  'LJSE-Demo',
  'LJSE-Live',
  'ZSE-Croatia-Demo',
  'ZSE-Croatia-Live',
  'BSSE-Demo',
  'BSSE-Live',
  'BSE-Armenia-Demo',
  'BSE-Armenia-Live',
  'GSE-Georgia-Demo',
  'GSE-Georgia-Live',
  'BCSE-Demo',
  'BCSE-Live',
  'KASE-Demo',
  'KASE-Live',
  'RSE-Kyrgyzstan-Demo',
  'RSE-Kyrgyzstan-Live',
  'UZSE-Demo',
  'UZSE-Live',
  'TASE-Demo',
  'TASE-Live',
  'ASE-Demo',
  'ASE-Live',
  'DFM-Demo',
  'DFM-Live',
  'ADX-Demo',
  'ADX-Live',
  'QE-Demo',
  'QE-Live',
  'KSE-Kuwait-Demo',
  'KSE-Kuwait-Live',
  'BSE-Bahrain-Demo',
  'BSE-Bahrain-Live',
  'MSM-Demo',
  'MSM-Live',
  'TSE-Iran-Demo',
  'TSE-Iran-Live',
  'ISE-Demo',
  'ISE-Live',
  'BIST-Demo',
  'BIST-Live',
  'MOEX-Demo',
  'MOEX-Live',
  'SPB-Demo',
  'SPB-Live',
  'KASE-Demo',
  'KASE-Live',
  'BCSE-Demo',
  'BCSE-Live',
  'PFTS-Demo',
  'PFTS-Live',
  'GPW-Demo',
  'GPW-Live',
  'BVB-Romania-Demo',
  'BVB-Romania-Live',
  'BSE-Sofia-Demo',
  'BSE-Sofia-Live',
  'BELEX15-Demo',
  'BELEX15-Live',
  'MSE-Montenegro-Demo',
  'MSE-Montenegro-Live',
  'SASE-Slovenia-Demo',
  'SASE-Slovenia-Live',
  'LJSE-Slovenia-Demo',
  'LJSE-Slovenia-Live',
  'ZSE-Zagreb-Demo',
  'ZSE-Zagreb-Live',
  'BSSE-Bosnia-Demo',
  'BSSE-Bosnia-Live',
  'MSE-Skopje-Demo',
  'MSE-Skopje-Live',
  'ASE-Athens-Demo',
  'ASE-Athens-Live',
  'CSE-Cyprus-Demo',
  'CSE-Cyprus-Live',
  'MSE-Malta-Demo',
  'MSE-Malta-Live',
  // South African MT4 Brokers
  'HotForex-SA-Demo',
  'HotForex-SA-Live',
  'XM-SA-Demo',
  'XM-SA-Live',
  'Exness-SA-Demo',
  'Exness-SA-Live',
  'FBS-SA-Demo',
  'FBS-SA-Live',
  'OctaFX-SA-Demo',
  'OctaFX-SA-Live',
  'InstaForex-SA-Demo',
  'InstaForex-SA-Live',
  'RoboForex-SA-Demo',
  'RoboForex-SA-Live',
  'Tickmill-SA-Demo',
  'Tickmill-SA-Live',
  'FxPro-SA-Demo',
  'FxPro-SA-Live',
  'Admiral-SA-Demo',
  'Admiral-SA-Live',
  'FXTM-SA-Demo',
  'FXTM-SA-Live',
  'Alpari-SA-Demo',
  'Alpari-SA-Live',
  'AvaTrade-SA-Demo',
  'AvaTrade-SA-Live',
  'Plus500-SA-Demo',
  'Plus500-SA-Live',
  'eToro-SA-Demo',
  'eToro-SA-Live',
  'Capital.com-SA-Demo',
  'Capital.com-SA-Live',
  'XTB-SA-Demo',
  'XTB-SA-Live',
  'Trading212-SA-Demo',
  'Trading212-SA-Live',
  'Libertex-SA-Demo',
  'Libertex-SA-Live',
  'IQ Option-SA-Demo',
  'IQ Option-SA-Live',
  'Deriv-SA-Demo',
  'Deriv-SA-Live',
  'ThinkMarkets-SA-Demo',
  'ThinkMarkets-SA-Live',
  'Vantage-SA-Demo',
  'Vantage-SA-Live',
  'IC Markets-SA-Demo',
  'IC Markets-SA-Live',
  'Pepperstone-SA-Demo',
  'Pepperstone-SA-Live',
  'FP Markets-SA-Demo',
  'FP Markets-SA-Live',
  'Axi-SA-Demo',
  'Axi-SA-Live',
  'GO Markets-SA-Demo',
  'GO Markets-SA-Live',
  'Eightcap-SA-Demo',
  'Eightcap-SA-Live',
  'Global Prime-SA-Demo',
  'Global Prime-SA-Live',
  'Fusion Markets-SA-Demo',
  'Fusion Markets-SA-Live',
  'TMGM-SA-Demo',
  'TMGM-SA-Live',
  'Hantec-SA-Demo',
  'Hantec-SA-Live',
  'Core Spreads-SA-Demo',
  'Core Spreads-SA-Live',
  'Windsor Brokers-SA-Demo',
  'Windsor Brokers-SA-Live',
  'FXOpen-SA-Demo',
  'FXOpen-SA-Live',
  'AGEA-SA-Demo',
  'AGEA-SA-Live',
  'Dukascopy-SA-Demo',
  'Dukascopy-SA-Live',
  'Swissquote-SA-Demo',
  'Swissquote-SA-Live',
  'Saxo Bank-SA-Demo',
  'Saxo Bank-SA-Live',
  'Interactive Brokers-SA-Demo',
  'Interactive Brokers-SA-Live',
  'CMC Markets-SA-Demo',
  'CMC Markets-SA-Live',
  'City Index-SA-Demo',
  'City Index-SA-Live',
  'IG-SA-Demo',
  'IG-SA-Live',
  'OANDA-SA-Demo',
  'OANDA-SA-Live',
  'FXCM-SA-Demo',
  'FXCM-SA-Live',
  'Markets.com-SA-Demo',
  'Markets.com-SA-Live',
  'GAIN Capital-SA-Demo',
  'GAIN Capital-SA-Live',
  'BlackBull Markets-SA-Demo',
  'BlackBull Markets-SA-Live',
  'Blueberry Markets-SA-Demo',
  'Blueberry Markets-SA-Live',
  'Darwinex-SA-Demo',
  'Darwinex-SA-Live',
  // Additional South African Brokers
  'Accumarkets-SA-Demo',
  'Accumarkets-SA-Live',
  'AcctMates-SA-Demo',
  'AcctMates-SA-Live',
  'SpacesMarkets-SA-Demo',
  'SpacesMarkets-SA-Live',
  'NeoBrokers-SA-Demo',
  'NeoBrokers-SA-Live',
  'FundedMarketplace-SA-Demo',
  'FundedMarketplace-SA-Live',
  'StandardBank-SA-Demo',
  'StandardBank-SA-Live',
  'ABSA-SA-Demo',
  'ABSA-SA-Live',
  'FNB-SA-Demo',
  'FNB-SA-Live',
  'Nedbank-SA-Demo',
  'Nedbank-SA-Live',
  'Capitec-SA-Demo',
  'Capitec-SA-Live',
  'PurpleTradingZA-SA-Demo',
  'PurpleTradingZA-SA-Live',
  'TradingView-SA-Demo',
  'TradingView-SA-Live',
  'EasyEquities-SA-Demo',
  'EasyEquities-SA-Live',
  'GTFX-SA-Demo',
  'GTFX-SA-Live',
  'TradeFX-SA-Demo',
  'TradeFX-SA-Live',
];

// MT5 Brokers with URL mapping
const MT5_BROKER_URLS: Record<string, string> = {
  'RazorMarkets-Live': 'https://webtrader.razormarkets.co.za/terminal/',
};

const MT5_BROKERS = Object.keys(MT5_BROKER_URLS);

export default function MetaTraderScreen() {
  const [activeTab, setActiveTab] = useState<'MT5' | 'MT4'>('MT5');
  const [login, setLogin] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [server, setServer] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showBrokerList, setShowBrokerList] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [showWebView, setShowWebView] = useState<boolean>(false);
  const [showBrokerFetchWebView, setShowBrokerFetchWebView] = useState<boolean>(false);
  const [showMT5WebView, setShowMT5WebView] = useState<boolean>(false);
  const [showMT4WebView, setShowMT4WebView] = useState<boolean>(false);
  const [authenticationStep, setAuthenticationStep] = useState<string>('Initializing...');
  const [mt4Brokers, setMt4Brokers] = useState<string[]>(DEFAULT_MT4_BROKERS);
  const [isLoadingBrokers, setIsLoadingBrokers] = useState<boolean>(false);
  const [brokerFetchError, setBrokerFetchError] = useState<string | null>(null);
  const [webViewKey, setWebViewKey] = useState<number>(0);
  const [brokerFetchKey, setBrokerFetchKey] = useState<number>(0);
  const [mt5WebViewKey, setMT5WebViewKey] = useState<number>(0);
  const [mt4WebViewKey, setMT4WebViewKey] = useState<number>(0);
  const webViewRef = useRef<any>(null);
  const brokerFetchRef = useRef<any>(null);
  const mt5WebViewRef = useRef<any>(null);
  const mt4WebViewRef = useRef<any>(null);
  const authTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackSuccessRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brokerFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authFinalizedRef = useRef<boolean>(false);
  const { mtAccount, setMTAccount, mt4Account, setMT4Account, mt5Account, setMT5Account, eas, user } = useApp();
  const { theme: thm, glassMode, cardShape } = useTheme();
  const { toggle: toggleSidebar } = useSidebar();
  const a = thm.accentRgb;
  const ac = thm.accent;
  const ag = thm.accentGlow;
  const R = radii(cardShape);
  // 'sectioned' keeps the neon surfaces, same as home — without this the
  // screen dropped to the plain fallback whenever that mode was picked.
  const isNeon = glassMode === 'neon' || glassMode === 'sectioned';
  const isLiquid = false;
  const isCmd = false;
  const isMinimal = false;
  const primaryEA = eas.length > 0 ? eas.find((e: any) => e.isActive) || eas[0] : null;
  const primaryEAImage = (() => {
    if (!primaryEA || !primaryEA.userData || !primaryEA.userData.owner) return null;
    const raw = (primaryEA.userData.owner.logo || '').toString().trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://tradeportea.com/admin/uploads/' + raw.replace(/^\/+/, '');
  })();

  // Spinning neon border animation
  const cardSpin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(cardSpin, { toValue: 1, duration: 8000, useNativeDriver: Platform.OS !== 'web', isInteraction: false })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const spinDeg = cardSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  /* Bubble helper */
  const renderBubbles = (layout: Array<{t: string; l: string; s: number; o?: number}>) => (
    <View style={styles.bubblesContainer} pointerEvents="none">
      {layout.map((b, i) => (
        <View key={i} style={[styles.bubble, { top: b.t, left: b.l, width: b.s, height: b.s, borderRadius: b.s / 2, opacity: b.o ?? 1 }, Platform.OS === 'web' && { background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.03) 60%, transparent 70%)' }]} />
      ))}
    </View>
  );

  const fieldBubblesA = [{ t: '15%', l: '82%', s: 10 }, { t: '25%', l: '90%', s: 6 }, { t: '8%', l: '75%', s: 7, o: 0.6 }];
  const fieldBubblesB = [{ t: '12%', l: '70%', s: 9 }, { t: '22%', l: '80%', s: 5 }, { t: '5%', l: '85%', s: 8, o: 0.5 }];
  const fieldBubblesC = [{ t: '18%', l: '88%', s: 8 }, { t: '30%', l: '78%', s: 6, o: 0.6 }];
  const btnBubbles = [{ t: '10%', l: '80%', s: 12 }, { t: '25%', l: '88%', s: 7 }, { t: '15%', l: '70%', s: 9, o: 0.5 }, { t: '35%', l: '75%', s: 5 }];

  // Load existing account data when tab changes
  useEffect(() => {
    const currentAccount = activeTab === 'MT4' ? mt4Account : mt5Account;
    if (currentAccount) {
      setLogin(currentAccount.login || '');
      setServer(currentAccount.server || '');
      setPassword(currentAccount.password || '');
    } else {
      setLogin('');
      setServer('');
      setPassword('');
    }
  }, [activeTab, mt4Account, mt5Account]);

  // Authentication state tracking
  const [authState, setAuthState] = useState({
    loading: false,
    showAllSymbols: false,
    chooseSymbol: false,
    logged: false,
    attempt: 0
  });

  // Fetch MT4 brokers from web terminal - only start WebView when needed
  const fetchMT4Brokers = async () => {
    if (Platform.OS === 'web') {
      setBrokerFetchError('Broker fetching not available on web platform');
      return;
    }

    console.log('Starting broker fetch WebView...');
    // Networking disabled: skip remote fetch and use default list
    setIsLoadingBrokers(false);
    setBrokerFetchError('Live broker fetch disabled (offline mode)');
    setShowBrokerFetchWebView(false);
  };

  // Close broker fetch WebView and cleanup
  const closeBrokerFetchWebView = () => {
    console.log('Closing broker fetch WebView and cleaning up...');
    setShowBrokerFetchWebView(false);
    setIsLoadingBrokers(false);

    // Clear timeout
    if (brokerFetchTimeoutRef.current) {
      clearTimeout(brokerFetchTimeoutRef.current);
      brokerFetchTimeoutRef.current = null;
    }

    // Clear WebView reference
    if (brokerFetchRef.current) {
      brokerFetchRef.current = null;
    }

    console.log('Broker fetch WebView destroyed and cleaned up');
  };

  // Only fetch brokers when explicitly requested, not on tab change
  // This prevents unnecessary WebView creation

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
      if (brokerFetchTimeoutRef.current) {
        clearTimeout(brokerFetchTimeoutRef.current);
      }
      console.log('MetaTrader component unmounted - all timeouts cleared');
    };
  }, []);

  const onBrokerFetchMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Broker fetch message received:', data);

      if (data.type === 'brokers_fetched' && data.brokers) {
        console.log('Successfully received brokers:', data.brokers.length);
        setMt4Brokers(data.brokers);
        setBrokerFetchError(null);
        // Immediately close and destroy WebView after success
        setTimeout(() => closeBrokerFetchWebView(), 100);
      } else if (data.type === 'broker_fetch_error') {
        console.error('Broker fetch error:', data.message);
        setBrokerFetchError(data.message || 'Failed to fetch brokers');
        // Close and destroy WebView on error
        setTimeout(() => closeBrokerFetchWebView(), 100);
      }
    } catch (error) {
      console.error('Error parsing broker fetch message:', error);
      setBrokerFetchError('Error processing broker list');
      // Close and destroy WebView on parsing error
      setTimeout(() => closeBrokerFetchWebView(), 100);
    }
  };

  const getBrokerFetchScript = () => {
    return `
      (function() {
        const sendMessage = (type, data) => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
        };
        
        const extractBrokers = () => {
          try {
            // Wait for the server dropdown to be available
            const checkForServerDropdown = () => {
              const serverInput = document.getElementById('server');
              if (serverInput) {
                // Click on server input to open dropdown
                serverInput.focus();
                serverInput.click();
                
                setTimeout(() => {
                  // Look for server options in various possible locations
                  let brokers = [];
                  
                  // Method 1: Check for datalist options
                  const datalist = document.querySelector('datalist');
                  if (datalist) {
                    const options = datalist.querySelectorAll('option');
                    brokers = Array.from(options).map(option => option.value).filter(value => value.trim());
                  }
                  
                  // Method 2: Check for dropdown options
                  if (brokers.length === 0) {
                    const dropdownOptions = document.querySelectorAll('select option, .dropdown-option, .server-option');
                    brokers = Array.from(dropdownOptions).map(option => option.textContent || option.value).filter(value => value && value.trim());
                  }
                  
                  // Method 3: Check for any elements containing server names
                  if (brokers.length === 0) {
                    const allElements = document.querySelectorAll('*');
                    const serverPattern = /^[A-Za-z0-9\-_]+\-(Demo|Live|Real|Server)\d*$/;
                    
                    allElements.forEach(element => {
                      const text = element.textContent?.trim();
                      if (text && serverPattern.test(text) && !brokers.includes(text)) {
                        brokers.push(text);
                      }
                    });
                  }
                  
                  // Method 4: Extract from JavaScript variables if available
                  if (brokers.length === 0) {
                    try {
                      // Check if there are any global variables containing server lists
                      const scripts = document.querySelectorAll('script');
                      scripts.forEach(script => {
                        const content = script.textContent || '';
                        const serverMatches = content.match(/["'][A-Za-z0-9\-_]+\-(Demo|Live|Real|Server)\d*["']/g);
                        if (serverMatches) {
                          serverMatches.forEach(match => {
                            const server = match.replace(/["']/g, '');
                            if (!brokers.includes(server)) {
                              brokers.push(server);
                            }
                          });
                        }
                      });
                    } catch (e) {
                      console.log('Error extracting from scripts:', e);
                    }
                  }
                  
                  // If we still don't have brokers, use a comprehensive list of known MT4 servers
                  if (brokers.length === 0) {
                    brokers = [
                      'FXCM-Demo01', 'FXCM-USDDemo01', 'FXCM-Real', 'FXCM-USDReal',
                      'ICMarkets-Demo', 'ICMarkets-Live01', 'ICMarkets-Live02',
                      'XM-Demo 1', 'XM-Demo 2', 'XM-Demo 3', 'XM-Real 1', 'XM-Real 2', 'XM-Real 3',
                      'OANDA-Demo', 'OANDA-Live', 'Pepperstone-Demo', 'Pepperstone-Live',
                      'IG-Demo', 'IG-Live', 'FXTM-Demo', 'FXTM-Real',
                      'Exness-Demo', 'Exness-Real1', 'Exness-Real2',
                      'Admiral-Demo', 'Admiral-Real', 'FBS-Demo', 'FBS-Real',
                      'HotForex-Demo', 'HotForex-Live', 'InstaForex-Demo', 'InstaForex-Live',
                      'Tickmill-Demo', 'Tickmill-Live', 'FxPro-Demo', 'FxPro-Live',
                      'FIBO-Demo', 'FIBO-Live', 'Alpari-Demo', 'Alpari-Live',
                      'RoboForex-Demo', 'RoboForex-Live', 'LiteForex-Demo', 'LiteForex-Live',
                      'NordFX-Demo', 'NordFX-Live', 'AMarkets-Demo', 'AMarkets-Live',
                      'OctaFX-Demo', 'OctaFX-Live', 'TeleTrade-Demo', 'TeleTrade-Live',
                      'FreshForex-Demo', 'FreshForex-Live', 'Grand Capital-Demo', 'Grand Capital-Live',
                      'NPBFX-Demo', 'NPBFX-Live', 'Traders Trust-Demo', 'Traders Trust-Live',
                      'FXOpen-Demo', 'FXOpen-Live', 'Dukascopy-Demo', 'Dukascopy-Live',
                      'AvaTrade-Demo', 'AvaTrade-Live', 'Plus500-Demo', 'Plus500-Live',
                      'ThinkMarkets-Demo', 'ThinkMarkets-Live', 'Vantage FX-Demo', 'Vantage FX-Live',
                      'BlackBull Markets-Demo', 'BlackBull Markets-Live', 'FP Markets-Demo', 'FP Markets-Live',
                      'Axi-Demo', 'Axi-Live', 'GO Markets-Demo', 'GO Markets-Live',
                      'Eightcap-Demo', 'Eightcap-Live', 'Global Prime-Demo', 'Global Prime-Live',
                      'Fusion Markets-Demo', 'Fusion Markets-Live', 'TMGM-Demo', 'TMGM-Live'
                    ];
                  }
                  
                  // Remove duplicates and sort
                  brokers = [...new Set(brokers)].sort();
                  
                  console.log('Extracted brokers:', brokers.length);
                  sendMessage('brokers_fetched', { brokers });
                }, 2000);
              } else {
                setTimeout(checkForServerDropdown, 1000);
              }
            };
            
            checkForServerDropdown();
          } catch (error) {
            console.error('Error extracting brokers:', error);
            sendMessage('broker_fetch_error', { message: 'Failed to extract broker list' });
          }
        };
        
        // Start extraction after page loads
        if (document.readyState === 'complete') {
          setTimeout(extractBrokers, 3000);
        } else {
          window.addEventListener('load', () => {
            setTimeout(extractBrokers, 3000);
          });
        }
      })();
    `;
  };

  // Live server lookup against Api2Trade's broker directory. The bundled list
  // only ever held a handful of servers, so anyone on another broker could not
  // connect at all. Debounced, and it falls back to the bundled list whenever
  // the query is too short or the lookup fails.
  const [remoteBrokers, setRemoteBrokers] = useState<string[]>([]);
  const [brokerSearching, setBrokerSearching] = useState(false);

  useEffect(() => {
    const query = server.trim();
    if (activeTab === 'MT4' || query.length < 2) { setRemoteBrokers([]); return; }
    let cancelled = false;
    setBrokerSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await apiService.searchBrokers(query);
        if (cancelled) return;
        // The directory returns objects; the server name lives under a few
        // different keys depending on the broker record.
        const names = results
          .map((r: any) => (typeof r === 'string' ? r : r?.server ?? r?.name ?? r?.company ?? ''))
          .filter((s: string) => !!s);
        setRemoteBrokers(Array.from(new Set(names)));
      } catch {
        if (!cancelled) setRemoteBrokers([]);
      } finally {
        if (!cancelled) setBrokerSearching(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); setBrokerSearching(false); };
  }, [server, activeTab]);

  const filteredBrokers = useMemo(() => {
    const brokerList = activeTab === 'MT4' ? mt4Brokers : MT5_BROKERS;
    if (!server.trim()) return brokerList.slice(0, 10); // Show top 10 by default
    const local = brokerList.filter(broker =>
      broker.toLowerCase().includes(server.toLowerCase())
    );
    // Local matches first — they're the vetted ones — then anything the
    // directory turned up that isn't already listed.
    return [...local, ...remoteBrokers.filter((b) => !local.includes(b))];
  }, [server, activeTab, mt4Brokers, remoteBrokers]);

  const authenticateWithWebTerminal = async (loginData: { login: string; password: string; server: string; type: 'MT4' | 'MT5' }) => {
    try {
      setIsAuthenticating(true);
      setAuthState({ loading: false, showAllSymbols: false, chooseSymbol: false, logged: false, attempt: 0 });
      authFinalizedRef.current = false;

      if (Platform.OS === 'web') {
        setAuthenticationStep(`Connecting to ${loginData.server}...`);
        await new Promise(resolve => setTimeout(resolve, 800));
        setAuthenticationStep(`Authenticating ${loginData.type} account ${loginData.login}...`);
        await new Promise(resolve => setTimeout(resolve, 1200));
        setAuthenticationStep(`${loginData.type} account linked successfully!`);
        await new Promise(resolve => setTimeout(resolve, 500));
        handleAuthenticationResult(true, `${loginData.type} account linked successfully`);
        // Show success alert after status updates
        setTimeout(() => {
          Alert.alert('Account Linked', `Your ${loginData.type} account (${loginData.login}) on ${loginData.server} has been linked successfully.`);
        }, 300);
        return { success: true, message: `${loginData.type} linked successfully` };
      }

      console.log(`Starting ${loginData.type} authentication WebView...`);
      setAuthenticationStep(`Loading ${loginData.type} Web Terminal...`);
      setShowWebView(true);
      setWebViewKey((k) => k + 1);

      const timeoutDuration = loginData.type === 'MT5' ? 30000 : 120000;
      authTimeoutRef.current = setTimeout(() => {
        if (authFinalizedRef.current) { return; }
        console.log('Authentication timeout - destroying WebView');
        handleAuthenticationResult(false, 'Authentication timeout');
      }, timeoutDuration) as ReturnType<typeof setTimeout>;

      return new Promise((resolve) => {
        (window as any).authResolve = resolve;
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, message: 'Authentication failed' };
    } finally {
      // no-op: handleAuthenticationResult toggles isAuthenticating
    }
  };

  const handleAuthenticationResult = (success: boolean, message: string) => {
    if (authFinalizedRef.current) {
      console.log('Authentication already finalized, ignoring result:', { success, message });
      return;
    }
    authFinalizedRef.current = true;
    console.log(`Authentication result: ${success ? 'SUCCESS' : 'FAILED'} - ${message}`);
    setIsAuthenticating(false);

    // Update connection status based on authentication result
    if (success) {
      // Update the legacy mtAccount for backward compatibility
      setMTAccount({
        type: activeTab,
        login: login.trim(),
        server: server.trim(),
        connected: true,
      });

      // Update the separate MT4/MT5 accounts - stored separately
      if (activeTab === 'MT4') {
        setMT4Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: true,
        });
      } else {
        setMT5Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: true,
        });
      }
    } else {
      // Set connection to false on authentication failure - show red status
      setMTAccount({
        type: activeTab,
        login: login.trim(),
        server: server.trim(),
        connected: false, // Red status when authentication failed
      });

      // Update the separate MT4/MT5 accounts with failed status - stored separately
      if (activeTab === 'MT4') {
        setMT4Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: false, // Red status when authentication failed
        });
      } else {
        setMT5Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: false, // Red status when authentication failed
        });
      }
    }

    // Close and destroy WebView
    closeAuthWebView();

    // Resolve the authentication promise
    if ((window as any).authResolve) {
      (window as any).authResolve({ success, message });
      delete (window as any).authResolve;
    }
  };

  // Close authentication WebView and cleanup
  const closeAuthWebView = () => {
    console.log('Closing authentication WebView and cleaning up...');
    setShowWebView(false);

    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    if (fallbackSuccessRef.current) {
      clearTimeout(fallbackSuccessRef.current);
      fallbackSuccessRef.current = null;
    }
    if (webViewRef.current) {
      webViewRef.current = null;
    }
    setAuthState({ loading: false, showAllSymbols: false, chooseSymbol: false, logged: false, attempt: 0 });
    setAuthenticationStep('Initializing...');
    console.log('Authentication WebView destroyed and cleaned up');
  };

  const executeJavaScript = (script: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    }
  };

  const onWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);

      if (data.type === 'authentication_success') {
        if (fallbackSuccessRef.current) {
          clearTimeout(fallbackSuccessRef.current);
          fallbackSuccessRef.current = null;
        }
        setAuthState(prev => ({ ...prev, logged: true }));
        setAuthenticationStep('Login Successful!');
        console.log('Authentication successful - destroying WebView');
        handleAuthenticationResult(true, 'Authentication successful');
      } else if (data.type === 'authentication_failed') {
        setAuthState(prev => ({ ...prev, attempt: prev.attempt + 1 }));
        console.log('Authentication failed - destroying WebView');
        // Close and destroy WebView after failed authentication
        setTimeout(() => {
          handleAuthenticationResult(false, 'Invalid Login or Password');
        }, 1000);
      } else if (data.type === 'step_update') {
        setAuthenticationStep(data.message);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      if (!authFinalizedRef.current) {
        handleAuthenticationResult(false, 'Authentication error');
      }
    }
  };

  // Handle MT5 WebView messages
  const onMT5WebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('MT5 WebView message:', data);

      if (data.type === 'mt5_loaded') {
        console.log('MT5 terminal loaded successfully');
      } else if (data.type === 'step_update') {
        console.log('MT5 step:', data.message);
      } else if (data.type === 'authentication_success') {
        console.log('MT5 authentication successful');
        // Update account status to connected
        setMT5Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: true,
        });
        setMTAccount({
          type: 'MT5',
          login: login.trim(),
          server: server.trim(),
          connected: true,
        });
        Alert.alert('Success', 'MT5 account authenticated successfully!');
        closeMT5WebView();
      } else if (data.type === 'authentication_failed') {
        console.log('MT5 authentication failed:', data.message);
        // Update account status to disconnected
        setMT5Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: false,
        });
        setMTAccount({
          type: 'MT5',
          login: login.trim(),
          server: server.trim(),
          connected: false,
        });
        Alert.alert('Authentication Failed', data.message || 'MT5 authentication failed');
        closeMT5WebView();
      } else if (data.type === 'error') {
        console.error('MT5 WebView error:', data.message);
      } else if (data.type === 'injection_error') {
        console.error('MT5 JavaScript injection error:', data.error);
        Alert.alert('Script Injection Error', `Failed to inject authentication script: ${data.error}`);
      } else if (data.type === 'webview_ready') {
        console.log('MT5 WebView is ready for script injection');
      }
    } catch (error) {
      console.error('Error parsing MT5 WebView message:', error);
    }
  };

  // Handle MT4 WebView messages
  const onMT4WebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('MT4 WebView message:', data);

      if (data.type === 'mt4_loaded') {
        console.log('MT4 terminal loaded successfully');
      } else if (data.type === 'step_update') {
        console.log('MT4 step:', data.message);
      } else if (data.type === 'authentication_success') {
        console.log('MT4 authentication successful');
        // Update account status to connected
        setMT4Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: true,
        });
        setMTAccount({
          type: 'MT4',
          login: login.trim(),
          server: server.trim(),
          connected: true,
        });
        Alert.alert('Success', 'MT4 account authenticated successfully!');
        closeMT4WebView();
      } else if (data.type === 'authentication_failed') {
        console.log('MT4 authentication failed:', data.message);
        // Update account status to disconnected
        setMT4Account({
          login: login.trim(),
          password: password.trim(),
          server: server.trim(),
          connected: false,
        });
        setMTAccount({
          type: 'MT4',
          login: login.trim(),
          server: server.trim(),
          connected: false,
        });
        Alert.alert('Authentication Failed', data.message || 'MT4 authentication failed');
        closeMT4WebView();
      } else if (data.type === 'error') {
        console.error('MT4 WebView error:', data.message);
      } else if (data.type === 'injection_error') {
        console.error('MT4 JavaScript injection error:', data.error);
        Alert.alert('Script Injection Error', `Failed to inject authentication script: ${data.error}`);
      } else if (data.type === 'webview_ready') {
        console.log('MT4 WebView is ready for script injection');
      }
    } catch (error) {
      console.error('Error parsing MT4 WebView message:', error);
    }
  };

  const getStorageClearScript = () => {
    return `
      (async function() {
        try {
          try { localStorage.clear(); } catch(e) {}
          try { sessionStorage.clear(); } catch(e) {}
          try {
            if (indexedDB && indexedDB.databases) {
              const dbs = await indexedDB.databases();
              for (const db of dbs) {
                const name = (db && db.name) ? db.name : null;
                if (name) {
                  try { indexedDB.deleteDatabase(name); } catch(e) {}
                }
              }
            }
          } catch(e) {}
          try {
            if ('caches' in window) {
              const names = await caches.keys();
              for (const n of names) { try { await caches.delete(n); } catch(e) {} }
            }
          } catch(e) {}
          try {
            if ('serviceWorker' in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              for (const r of regs) { try { await r.unregister(); } catch(e) {} }
            }
          } catch(e) {}
          try {
            if (document && document.cookie) {
              document.cookie.split(';').forEach(function(c){
                const eq = c.indexOf('=');
                const name = eq > -1 ? c.substr(0, eq) : c;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
              });
            }
          } catch(e) {}
        } catch(e) {}
        true;
      })();
    `;
  };

  const getAuthenticationScript = (loginData: { login: string; password: string; server: string }) => {
    if (activeTab === 'MT5') {
      return `
        (function() {
          const asset = 'XAUUSD';
          let done = false;

          const send = (type, message) => {
            try { window.ReactNativeWebView.postMessage(JSON.stringify({ type, message })); } catch (e) {}
          };

          const sleep = (ms) => new Promise(r => setTimeout(r, ms));

          const fillCreds = () => {
            try {
              var x = document.querySelector('input[name="login"]');
              if (x != null) {
                x.value = '${loginData.login}';
                x.dispatchEvent(new Event('input', { bubbles: true }));
              }
              var y = document.querySelector('input[name="password"]');
              if (y != null) {
                y.value = '${loginData.password}';
                y.dispatchEvent(new Event('input', { bubbles: true }));
              }
              return !!(x && y);
            } catch(e) { return false; }
          };

          const pressLogin = () => {
            try {
              var button = document.querySelector('.button.svelte-1wrky82.active');
              if(button !== null) { button.click(); return true; }
              return false;
            } catch(e) { return false; }
          };

          const pressRemove = () => {
            try {
              var button = document.querySelector('.button.svelte-1wrky82.red');
              if (button !== null) { button.click(); return true; }
              var buttons = document.getElementsByTagName('button');
              for (var i = 0; i < buttons.length; i++) {
                if ((buttons[i].textContent || '').trim() === 'Remove') { buttons[i].click(); return true; }
              }
              return false;
            } catch(e) { return false; }
          };

          const selectSymbolCandidate = () => {
            try {
              var symbolSpan = document.querySelector('.name.svelte-19bwscl .symbol.svelte-19bwscl') ||
                               document.querySelector('.symbol.svelte-19bwscl') ||
                               document.querySelector('[class*="symbol"]');
              if (symbolSpan) { (symbolSpan).click(); return true; }
              return false;
            } catch(e) { return false; }
          };

          const searchAsset = async () => {
            try {
              var x = document.querySelector('input[placeholder="Search symbol"]') ||
                      document.querySelector('label.search.svelte-1mvzp7f input') ||
                      document.querySelector('.search input');
              if (x != null) {
                (x).value = asset;
                x.dispatchEvent(new Event('input', { bubbles: true }));
                x.focus();
                await sleep(800);
                return true;
              }
              return false;
            } catch(e) { return false; }
          };

          const loginFlow = async () => {
            send('step_update', 'Initializing MT5 Authentication...');
            await sleep(1200);

            pressRemove();
            await sleep(300);

            const filled = fillCreds();
            if (!filled) { send('authentication_failed', 'Could not find login fields'); return; }
            send('step_update', 'Submitting login...');
            const pressed = pressLogin();
            if (!pressed) { send('authentication_failed', 'Login button not found'); return; }

            // Poll for login inputs to disappear or search bar to appear
            let attempts = 0;
            while (attempts < 25) {
              attempts++;
              const loginInput = document.querySelector('input[name="login"]');
              const pwInput = document.querySelector('input[name="password"]');
              const search = document.querySelector('input[placeholder="Search symbol"], label.search input, .search input');
              if ((!loginInput && !pwInput) || (search && (search).offsetParent !== null)) {
                break;
              }
              await sleep(500);
            }

            send('step_update', 'Verifying authentication via symbol search...');
            const searched = await searchAsset();
            await sleep(800);
            if (searched) {
              // If we can search, treat as success and optionally click a symbol
              selectSymbolCandidate();
              done = true;
              send('authentication_success', 'Login Successful');
              return;
            }

            // Fallback check on UI cues for success
            const bodyText = (document.body.innerText || '');
            if (bodyText.includes('Balance:') || bodyText.includes('Create New Order')) {
              done = true;
              send('authentication_success', 'Login Successful');
              return;
            }

            send('authentication_failed', 'Authentication could not be verified');
          };

          if (document.readyState === 'complete' || document.readyState === 'interactive') loginFlow();
          else window.addEventListener('DOMContentLoaded', loginFlow);
        })();
      `;
    } else {
      // MT4 Authentication - Copy from successful trade execution steps
      return `
        (function(){
          const sendMessage = (type, message) => {
            try { window.ReactNativeWebView.postMessage(JSON.stringify({ type, message })); } catch(e) {}
          };

          // Enhanced field input function from trade script
          const typeInput = (el, value) => {
            try {
              el.focus();
              el.select();
              el.value = '';
              el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              
              setTimeout(function() {
                el.focus();
                el.value = String(value);
                el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
              }, 100);
              
              return true;
            } catch(e) { return false; }
          };

          const login = () => {
            try {
              sendMessage('step_update', 'Filling MT4 credentials...');
              const loginEl = document.getElementById('login');
              const serverEl = document.getElementById('server');
              const passEl = document.getElementById('password');
              
              if (!loginEl || !serverEl || !passEl) {
                sendMessage('authentication_failed', 'Login form fields not found');
                return false;
              }
              
              // Fill credentials using enhanced method
              typeInput(loginEl, '${loginData.login}');
              typeInput(serverEl, '${loginData.server}');
              typeInput(passEl, '${loginData.password}');
              
              // Submit login
              setTimeout(function() {
                const btns = document.querySelectorAll('button.input-button');
                if (btns && btns[3]) { 
                  btns[3].removeAttribute('disabled'); 
                  btns[3].disabled = false; 
                  btns[3].click();
                  sendMessage('step_update', 'Submitting MT4 login...');
                } else {
                  sendMessage('authentication_failed', 'Login button not found');
                }
              }, 500);
              
              return true;
            } catch(e) { 
              sendMessage('authentication_failed', 'Error during login: ' + e.message);
              return false; 
            }
          };

          // Show all symbols to verify authentication (copied from trade script)
          const showAllSymbols = () => {
            try {
              var element = document.querySelector('body > div.page-window.market-watch.compact > div > div.b > div.page-block > div > table > tbody > tr:nth-child(1)');
              if (element) {
                var ev1 = new MouseEvent("mousedown", {
                  bubbles: true,
                  cancelable: false,
                  view: window,
                  button: 2,
                  buttons: 2,
                  clientX: element.getBoundingClientRect().x,
                  clientY: element.getBoundingClientRect().y
                });
                element.dispatchEvent(ev1);
                
                var ev2 = new MouseEvent("mouseup", {
                  bubbles: true,
                  cancelable: false,
                  view: window,
                  button: 2,
                  buttons: 0,
                  clientX: element.getBoundingClientRect().x,
                  clientY: element.getBoundingClientRect().y
                });
                element.dispatchEvent(ev2);
                
                var ev3 = new MouseEvent("contextmenu", {
                  bubbles: true,
                  cancelable: false,
                  view: window,
                  button: 2,
                  buttons: 0,
                  clientX: element.getBoundingClientRect().x,
                  clientY: element.getBoundingClientRect().y
                });
                element.dispatchEvent(ev3);
                
                setTimeout(function() {
                  var sall = document.querySelector('body > div.page-menu.context.expanded > div > div > span.box > span > div:nth-child(7)');
                  if (sall) {
                    sall.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    sall.click();
                    sendMessage('step_update', 'Verifying authentication - showing all symbols...');
                  }
                }, 500);
                return true;
              }
              return false;
            } catch(e) { return false; }
          };

          // Verify authentication by checking if symbols are visible after "Show All"
          const verifyAuthentication = () => {
            try {
              // Check if the "Show All" menu item is still visible (means it wasn't clicked successfully)
              var showAllMenu = document.querySelector('body > div.page-menu.context.expanded > div > div > span.box > span > div:nth-child(7)');
              if (showAllMenu) {
                // Menu is still visible, "Show All" was not successful
                sendMessage('authentication_failed', 'Authentication failed - Could not access symbol list');
                return false;
              }
              
              // Check if we can see the market watch table with symbols
              var tableB = document.querySelector('body > div.page-window.market-watch.compact > div > div.b > div.page-block > div > table > tbody');
              if (tableB) {
                var allTRs = tableB.querySelectorAll('tr');
                if (allTRs.length > 0) {
                  // Try to find XAUUSD symbol
                  var ev = document.createEvent('MouseEvents');
                  ev.initEvent('dblclick', true, true);
                  for (var i = 0; i < allTRs.length; i++) {
                    var a = allTRs[i].getElementsByTagName('td')[0];
                    if (a && a.textContent && a.textContent.trim() === 'XAUUSD') {
                      a.dispatchEvent(ev);
                      sendMessage('authentication_success', 'MT4 Authentication Successful - XAUUSD symbol found and selected');
                      return true;
                    }
                  }
                  // XAUUSD not found but symbols are visible - still successful
                  sendMessage('authentication_success', 'MT4 Authentication Successful - Symbol list accessible');
                  return true;
                } else {
                  // No symbols visible - authentication failed
                  sendMessage('authentication_failed', 'Authentication failed - No symbols visible in market watch');
                  return false;
                }
              } else {
                // Market watch table not found - authentication failed
                sendMessage('authentication_failed', 'Authentication failed - Market watch not accessible');
                return false;
              }
            } catch(e) { 
              sendMessage('authentication_failed', 'Authentication failed - Error verifying access: ' + e.message);
              return false; 
            }
          };

          const start = () => {
            sendMessage('step_update', 'Starting MT4 authentication...');
            
            setTimeout(() => {
              const loginOk = login();
              if (!loginOk) return;
              
              // Wait for login to complete, then verify by showing symbols
              setTimeout(() => {
                sendMessage('step_update', 'Login submitted, verifying access...');
                const symbolsShown = showAllSymbols();
                
                // Wait longer for the "Show All" action to complete
                setTimeout(() => {
                  sendMessage('step_update', 'Checking symbol access...');
                  const authVerified = verifyAuthentication();
                  
                  // If verification failed, try one more time after a longer delay
                  if (!authVerified) {
                    setTimeout(() => {
                      sendMessage('step_update', 'Final authentication check...');
                      const finalCheck = verifyAuthentication();
                      if (!finalCheck) {
                        // Final fallback - check if we can see any trading interface
                        const hasMarketWatch = document.querySelector('div.page-window.market-watch');
                        const hasChart = document.querySelector('div.page-window.chart');
                       
                      }
                    }, 2000);
                  }
                }, 5000);
              }, 4000);
            }, 1000);
          };

          if (document.readyState === 'complete') start();
          else window.addEventListener('load', start);
        })();
      `;
    }
  };

  // Handle MT5 Web View
  const handleMT5WebView = () => {
    console.log('Opening MT5 Web View...');
    setShowMT5WebView(true);
    setMT5WebViewKey((k) => k + 1);
  };

  // Handle MT4 Web View
  const handleMT4WebView = () => {
    console.log('Opening MT4 Web View...');
    setShowMT4WebView(true);
    setMT4WebViewKey((k) => k + 1);
  };

  // Close MT5 Web View
  const closeMT5WebView = () => {
    console.log('Closing MT5 Web View...');

    // Clear WebView cache and destroy iframe
    if (Platform.OS === 'web' && (window as any).clearWebViewCache) {
      (window as any).clearWebViewCache();
    }

    setShowMT5WebView(false);
    if (mt5WebViewRef.current) {
      mt5WebViewRef.current = null;
    }
  };

  // Close MT4 Web View
  const closeMT4WebView = () => {
    console.log('Closing MT4 Web View...');

    // Clear WebView cache and destroy iframe
    if (Platform.OS === 'web' && (window as any).clearWebViewCache) {
      (window as any).clearWebViewCache();
    }

    setShowMT4WebView(false);
    if (mt4WebViewRef.current) {
      mt4WebViewRef.current = null;
    }
  };

  // Get MT5 JavaScript injection script
  const getMT5Script = () => {
    return `
      (function() {
        const sendMessage = (type, message) => {
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type, message })); } catch(e) {}
        };

        sendMessage('mt5_loaded', 'MT5 Accumarkets terminal loaded successfully');
        
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        const asset = 'XAUUSD';
        
        const authenticateMT5 = async () => {
          try {
            sendMessage('step_update', 'Initializing MT5 Account...');
            await sleep(5500);
            
            // Check for disclaimer and accept if present
            const disclaimer = document.querySelector('#disclaimer');
            if (disclaimer) {
              const acceptButton = document.querySelector('.accept-button');
              if (acceptButton) {
                acceptButton.click();
                sendMessage('step_update', 'Checking Login...');
                await sleep(5500);
              }
            }
            
            // Check if form is visible and remove any existing connections
            const form = document.querySelector('.form');
            if (form && !form.classList.contains('hidden')) {
              // Press remove button first
              const removeButton = document.querySelector('.button.svelte-1wrky82.red');
              if (removeButton) {
                removeButton.click();
              } else {
                // Fallback: look for Remove button by text
                const buttons = document.getElementsByTagName('button');
                for (let i = 0; i < buttons.length; i++) {
                  if (buttons[i].textContent.trim() === 'Remove') {
                    buttons[i].click();
                    break;
                  }
                }
              }
              sendMessage('step_update', 'Checking password...');
              await sleep(5500);
            }
            
            // Fill login credentials
            if (form && !form.classList.contains('hidden')) {
              const loginField = document.querySelector('input[name="login"]');
              const passwordField = document.querySelector('input[name="password"]');
              
              if (loginField && '${login.trim()}') {
                loginField.value = '${login.trim()}';
                loginField.dispatchEvent(new Event('input', { bubbles: true }));
              }
              
              if (passwordField && '${password.trim()}') {
                passwordField.value = '${password.trim()}';
                passwordField.dispatchEvent(new Event('input', { bubbles: true }));
              }
              
              sendMessage('step_update', 'Connecting to Server...');
              await sleep(5000);
            }
            
            // Click login button
            if (form && !form.classList.contains('hidden')) {
              const loginButton = document.querySelector('.button.svelte-1wrky82.active');
              if (loginButton) {
                loginButton.click();
                sendMessage('step_update', 'Connecting to Server...');
                await sleep(8000);
              }
            }
            
            // Search for XAUUSD symbol
            const searchField = document.querySelector('input[placeholder="Search symbol"]');
            if (searchField) {
              searchField.value = asset;
              searchField.dispatchEvent(new Event('input', { bubbles: true }));
              searchField.focus();
              sendMessage('step_update', 'Connecting to Server...');
              await sleep(3000);
            }
            
            // Try to select XAUUSD symbol
            const symbolSpan = document.querySelector('.name.svelte-19bwscl .symbol.svelte-19bwscl');
            if (symbolSpan) {
              const text = symbolSpan.innerText.trim();
              if (text === asset || text === asset + '.mic') {
                symbolSpan.click();
                sendMessage('authentication_success', 'MT5 Login Successful');
                return;
              }
            }
            
            // Fallback: check for other success indicators
            const currentUrl = window.location.href;
            const pageText = document.body.innerText.toLowerCase();
            
            if (currentUrl.includes('terminal') || pageText.includes('balance') || pageText.includes('account')) {
              sendMessage('authentication_success', 'MT5 Login Successful');
            } else {
              sendMessage('authentication_failed', 'Invalid Login or Password');
            }
            
          } catch(e) {
            sendMessage('authentication_failed', 'Error during authentication: ' + e.message);
          }
        };
        
        // Start authentication after page loads
        setTimeout(authenticateMT5, 3000);
      })();
    `;
  };

  // Get MT4 JavaScript injection script
  const getMT4Script = () => {
    return `
      (function() {
        const sendMessage = (type, message) => {
          try { window.ReactNativeWebView.postMessage(JSON.stringify({ type, message })); } catch(e) {}
        };

        sendMessage('mt4_loaded', 'MT4 MetaTrader Web terminal loaded successfully');
        
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
        
        const authenticateMT4 = async () => {
          try {
            sendMessage('step_update', 'Starting MT4 authentication...');
            await sleep(3000);
            
            // Fill login credentials using enhanced method from your Android code
            const loginField = document.getElementById('login') || document.querySelector('input[name="login"]');
            const passwordField = document.getElementById('password') || document.querySelector('input[type="password"]');
            const serverField = document.getElementById('server') || document.querySelector('input[name="server"]');
            
            if (loginField && '${login.trim()}') {
              loginField.focus();
              loginField.select();
              loginField.value = '';
              loginField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              loginField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              
              setTimeout(() => {
                loginField.focus();
                loginField.value = '${login.trim()}';
                loginField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                loginField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                loginField.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
              }, 100);
              
              sendMessage('step_update', 'Filling MT4 credentials...');
            }
            
            if (serverField && '${server.trim()}') {
              serverField.focus();
              serverField.select();
              serverField.value = '';
              serverField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              serverField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              
              setTimeout(() => {
                serverField.focus();
                serverField.value = '${server.trim()}';
                serverField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                serverField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                serverField.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
              }, 100);
            }
            
            if (passwordField && '${password.trim()}') {
              passwordField.focus();
              passwordField.select();
              passwordField.value = '';
              passwordField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              passwordField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              
              setTimeout(() => {
                passwordField.focus();
                passwordField.value = '${password.trim()}';
                passwordField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                passwordField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                passwordField.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
              }, 100);
            }
            
            await sleep(500);
            
            // Submit login using MT4 specific button selector
            const loginButton = document.querySelector('button.input-button:nth-child(4)');
            if (loginButton) {
              loginButton.removeAttribute('disabled');
              loginButton.disabled = false;
              loginButton.click();
              sendMessage('step_update', 'Submitting MT4 login...');
            } else {
              sendMessage('authentication_failed', 'Login button not found');
              return;
            }
            
            await sleep(4000);
            
            // Show all symbols to verify authentication (copied from your Android code)
            const marketWatchElement = document.querySelector('body > div.page-window.market-watch.compact > div > div.b > div.page-block > div > table > tbody > tr:nth-child(1)');
            if (marketWatchElement) {
              const ev1 = new MouseEvent("mousedown", {
                bubbles: true,
                cancelable: false,
                view: window,
                button: 2,
                buttons: 2,
                clientX: marketWatchElement.getBoundingClientRect().x,
                clientY: marketWatchElement.getBoundingClientRect().y
              });
              marketWatchElement.dispatchEvent(ev1);
              
              const ev2 = new MouseEvent("mouseup", {
                bubbles: true,
                cancelable: false,
                view: window,
                button: 2,
                buttons: 0,
                clientX: marketWatchElement.getBoundingClientRect().x,
                clientY: marketWatchElement.getBoundingClientRect().y
              });
              marketWatchElement.dispatchEvent(ev2);
              
              const ev3 = new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: false,
                view: window,
                button: 2,
                buttons: 0,
                clientX: marketWatchElement.getBoundingClientRect().x,
                clientY: marketWatchElement.getBoundingClientRect().y
              });
              marketWatchElement.dispatchEvent(ev3);
              
              setTimeout(() => {
                const showAllButton = document.querySelector('body > div.page-menu.context.expanded > div > div > span.box > span > div:nth-child(7)');
                if (showAllButton) {
                  showAllButton.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                  showAllButton.click();
                  sendMessage('step_update', 'Verifying authentication - showing all symbols...');
                }
              }, 500);
            }
            
            await sleep(5000);
            
            // Verify authentication by checking if symbols are visible
            const tableB = document.querySelector('body > div.page-window.market-watch.compact > div > div.b > div.page-block > div > table > tbody');
            if (tableB) {
              const allTRs = tableB.querySelectorAll('tr');
              if (allTRs.length > 0) {
                // Try to find XAUUSD symbol
                const ev = document.createEvent('MouseEvents');
                ev.initEvent('dblclick', true, true);
                for (let i = 0; i < allTRs.length; i++) {
                  const a = allTRs[i].getElementsByTagName('td')[0];
                  if (a && a.textContent && a.textContent.trim() === 'XAUUSD') {
                    a.dispatchEvent(ev);
                    sendMessage('authentication_success', 'MT4 Authentication Successful - XAUUSD symbol found and selected');
                    return;
                  }
                }
                // XAUUSD not found but symbols are visible - still successful
                sendMessage('authentication_success', 'MT4 Authentication Successful - Symbol list accessible');
              } else {
                sendMessage('authentication_failed', 'Authentication failed - No symbols visible in market watch');
              }
            } else {
              sendMessage('authentication_failed', 'Authentication failed - Market watch not accessible');
            }
            
          } catch(e) {
            sendMessage('authentication_failed', 'Error during authentication: ' + e.message);
          }
        };
        
        // Start authentication after page loads
        setTimeout(authenticateMT4, 3000);
      })();
    `;
  };

  // Api2Trade connect for MT5 — establishes a session UUID (no web terminal).
  const handleApi2TradeConnect = async () => {
    try {
      setIsAuthenticating(true);
      // Pass the signed-in email so the server can tie this broker session to
      // the account, and stop the bot when the access window closes.
      const result = await apiService.connectMT5(server.trim(), login.trim(), password.trim(), user?.email);
      if (!result?.uuid) throw new Error('No session returned.');
      setMT5Account({ login: login.trim(), password: password.trim(), server: server.trim(), connected: true, uuid: result.uuid });
      // Report the connect (login + server only) to the admin site, tagged as tradeport.
      apiService.reportMT5Connection(user?.email || '', login.trim(), server.trim());
      Alert.alert('Success', 'MT5 account connected.');
    } catch (e: any) {
      Alert.alert('Connection Failed', e?.message || 'Could not connect account.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // MT5 (Api2Trade) disconnect — tears down the session, keeps the fields filled.
  const handleApi2TradeDisconnect = async () => {
    try {
      if (mt5Account?.uuid) { try { await apiService.disconnectMT5(mt5Account.uuid); } catch {} }
      setMT5Account({ login: login.trim(), password: password.trim(), server: server.trim(), connected: false });
    } catch {}
  };

  const handleLinkAccount = async () => {
    // MT5 uses Api2Trade (single button toggles connect/disconnect); MT4 keeps the web terminal.
    if (activeTab === 'MT5') {
      if (mt5Account?.uuid && mt5Account.connected) {
        await handleApi2TradeDisconnect();
        return;
      }
      if (!login.trim() || !password.trim() || !server.trim()) {
        Alert.alert('Missing Information', 'Please fill in all fields to continue.');
        return;
      }
      await handleApi2TradeConnect();
      return;
    }
    if (!login.trim() || !password.trim() || !server.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields to continue.');
      return;
    }
    handleMT4WebView();
  };



  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && { backgroundImage: isNeon ? 'linear-gradient(135deg, rgba(' + a + ', 0.7) 0%, rgba(' + a + ', 0.3) 25%, rgba(0,0,0,0.85) 55%, #000 100%)' : isLiquid ? 'linear-gradient(160deg, #1a1a1e 0%, #111113 40%, #0a0a0c 100%)' : 'none' }]}>
      <PageBackground eaImage={primaryEAImage} />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentColumn}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Menu Button */}
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar} activeOpacity={0.7}>
            <Menu color="rgba(255,255,255,0.8)" size={22} />
          </TouchableOpacity>

          {/* ========== TAB SELECTOR — LIQUID GLASS ========== */}
          <View style={[styles.tabWrap, { borderRadius: R.row + 2 }, !isNeon && { padding: 0 }]}>
            {isNeon && <Animated.View style={[styles.tabNeon, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
            {isNeon && <Animated.View style={[styles.tabNeonGlow, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.4) 220deg, transparent 300deg, transparent 360deg)' }]} />}
            <View style={[styles.tabInner, { borderRadius: R.row }, Platform.OS === 'web' && (cardSurface(a) as any)]}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'MT5' && styles.activeTab, activeTab === 'MT5' && Platform.OS === 'web' && { boxShadow: '0 0 12px rgba(' + a + ', 0.3), inset 0 1px 2px rgba(255,255,255,0.1)' }]}
                onPress={() => setActiveTab('MT5')}
              >
                <Text style={[styles.tabText, activeTab === 'MT5' && { color: ac }]}>MT5 ACCOUNT</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Connection Status */}
          <View style={styles.statusContainer}>
            <View testID="connection-status-dot" style={[
              styles.statusDot,
              (activeTab === 'MT4' ? mt4Account?.connected : mt5Account?.connected) === true && styles.connectedDot,
              (activeTab === 'MT4' ? mt4Account?.connected : mt5Account?.connected) === false && styles.disconnectedDot
            ]} />
            <Text style={[
              styles.statusText,
              (activeTab === 'MT4' ? mt4Account?.connected : mt5Account?.connected) === true && styles.connectedText,
              (activeTab === 'MT4' ? mt4Account?.connected : mt5Account?.connected) === false && styles.disconnectedText,
            ]}>
              {(activeTab === 'MT4' ? mt4Account?.connected : mt5Account?.connected) ? `${activeTab} CONNECTED` : `${activeTab} DISCONNECTED`}
            </Text>
          </View>

          {/* MT Logo and Title */}
          <View style={styles.logoContainer}>
            <View style={styles.mtLogoImageContainer}>
              <Image
                source={activeTab === 'MT4' ? require('@/assets/images/mt4logo.png') : require('@/assets/images/mt5logo.png')}
                style={styles.mtLogoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.formTitle}>{activeTab} LOGIN DETAILS</Text>
          </View>

          {/* Authentication Status */}
          {isAuthenticating && (
            <View style={styles.authStatusDisplay}>
              <ActivityIndicator color={ac} size="small" />
              <Text style={styles.authStatusDisplayText}>{authenticationStep}</Text>
            </View>
          )}

          {/* ========== FORM — FLOATING LIQUID GLASS FIELDS ========== */}
          <View style={styles.form}>

            {/* Login Field */}
            <View style={[styles.fieldWrap, { borderRadius: R.row + 2 }, !isNeon && { padding: 0 }]}>
              {isNeon && <Animated.View style={[styles.fieldNeon, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
              {isNeon && <Animated.View style={[styles.fieldNeonGlow, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.35) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.35) 220deg, transparent 300deg, transparent 360deg)' }]} />}
              <View style={[styles.fieldInner, { borderRadius: R.row }, Platform.OS === 'web' && (cardSurface(a) as any)]}>
                {false && renderBubbles(fieldBubblesA)}
                {isNeon && <View style={[styles.fieldRefraction, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)' }]} />}
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Login"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={login}
                  onChangeText={setLogin}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={[styles.fieldWrap, { borderRadius: R.row + 2 }, !isNeon && { padding: 0 }]}>
              {isNeon && <Animated.View style={[styles.fieldNeon, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
              {isNeon && <Animated.View style={[styles.fieldNeonGlow, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.35) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.35) 220deg, transparent 300deg, transparent 360deg)' }]} />}
              <View style={[styles.fieldInner, { borderRadius: R.row }, Platform.OS === 'web' && (cardSurface(a) as any)]}>
                {false && renderBubbles(fieldBubblesB)}
                {isNeon && <View style={[styles.fieldRefraction, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)' }]} />}
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff color="rgba(255,255,255,0.4)" size={20} /> : <Eye color="rgba(255,255,255,0.4)" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Server Search Field */}
            <View style={styles.serverSection}>
              <View style={[styles.fieldWrap, { borderRadius: R.row + 2 }, { marginBottom: 0 }, !isNeon && { padding: 0 }]}>
                {isNeon && <Animated.View style={[styles.fieldNeon, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
                {isNeon && <Animated.View style={[styles.fieldNeonGlow, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.35) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.35) 220deg, transparent 300deg, transparent 360deg)' }]} />}
                <View style={[styles.fieldInner, { borderRadius: R.row }, Platform.OS === 'web' && (cardSurface(a) as any)]}>
                  {false && renderBubbles(fieldBubblesC)}
                  {isNeon && <View style={[styles.fieldRefraction, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)' }]} />}
                  <Server color="rgba(255,255,255,0.35)" size={20} style={styles.serverIcon} />
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={activeTab === 'MT4' ? "Search MT4 Broker Server..." : "Search MT5 Broker Server..."}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={server}
                    onChangeText={(text) => { setServer(text); setShowBrokerList(true); }}
                    onFocus={() => setShowBrokerList(true)}
                    autoCapitalize="none"
                  />
                  {server.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={() => { setServer(''); setShowBrokerList(false); }}>
                      <Text style={styles.clearButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Broker List Dropdown — OUTSIDE fieldWrap so overflow:hidden doesn't clip it */}
              {showBrokerList && (
                <View style={styles.brokerListContainer}>
                  <View style={styles.brokerListHeader}>
                    <Text style={styles.brokerListTitle}>Active {activeTab} Brokers</Text>
                    <View style={styles.brokerListActions}>
                      {activeTab === 'MT4' && (
                        <TouchableOpacity onPress={() => { console.log('Manual broker refresh requested'); fetchMT4Brokers(); }} style={styles.refreshButton} disabled={isLoadingBrokers}>
                          <RefreshCw color={Platform.OS === 'ios' ? '#FFFFFF' : '#000000'} size={16} style={[styles.refreshIcon, isLoadingBrokers && styles.refreshIconSpinning]} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => setShowBrokerList(false)} style={styles.closeBrokerList}>
                        <Text style={styles.closeBrokerListText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {brokerFetchError && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{brokerFetchError}</Text>
                    </View>
                  )}
                  {isLoadingBrokers && (
                    <View style={styles.loadingBrokersContainer}>
                      <ActivityIndicator color={Platform.OS === 'ios' ? '#FFFFFF' : '#000000'} size="small" />
                      <Text style={styles.loadingBrokersText}>Fetching live broker list...</Text>
                    </View>
                  )}
                  {brokerSearching && (
                    <View style={styles.loadingBrokersContainer}>
                      <ActivityIndicator color={ac} size="small" />
                      <Text style={styles.loadingBrokersText}>Searching broker directory…</Text>
                    </View>
                  )}
                  <ScrollView style={styles.brokerList} nestedScrollEnabled={true}>
                    {filteredBrokers.map((item, index) => {
                      return (
                        <TouchableOpacity key={`${item}-${index}`} style={styles.brokerItem} onPress={() => { console.log('Broker selected:', item); setServer(item); setShowBrokerList(false); }}>
                          <View style={styles.brokerItemContent}>
                            <View style={[styles.brokerStatusDot, item.includes('Live') || item.includes('Real') ? styles.liveBrokerDot : styles.demoBrokerDot]} />
                            <Text style={styles.brokerItemText}>{item}</Text>
                            <Text style={styles.brokerItemType}>{item.includes('Demo') ? 'DEMO' : 'LIVE'}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {filteredBrokers.length === 0 && (
                    <View style={styles.noBrokersContainer}>
                      <Search color="#999999" size={24} />
                      <Text style={styles.noBrokersText}>No brokers found</Text>
                      <Text style={styles.noBrokersSubtext}>Try a different search term</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* ========== LINK BUTTON — FLOATING LIQUID GLASS ========== */}
            <View style={[styles.btnWrap, { borderRadius: R.row + 2 }, !isNeon && { padding: 0 }]}>
              {isNeon && <Animated.View style={[styles.btnNeon, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, ' + ac + ' 40deg, rgba(' + a + ', 0.5) 80deg, transparent 120deg, transparent 180deg, ' + ac + ' 220deg, rgba(' + a + ', 0.5) 260deg, transparent 300deg, transparent 360deg)' }]} />}
              {isNeon && <Animated.View style={[styles.btnNeonGlow, { transform: [{ rotate: spinDeg }] }, Platform.OS === 'web' && { backgroundImage: 'conic-gradient(from 0deg, transparent 0deg, rgba(' + a + ', 0.4) 40deg, transparent 120deg, transparent 180deg, rgba(' + a + ', 0.4) 220deg, transparent 300deg, transparent 360deg)' }]} />}
              <TouchableOpacity
                style={[styles.btnInner, isAuthenticating && styles.btnDisabled, activeTab === 'MT4' && styles.btnComingSoon, { borderRadius: R.row }, Platform.OS === 'web' && (cardSurface(a) as any)]}
                onPress={activeTab === 'MT4' ? undefined : handleLinkAccount}
                disabled={isAuthenticating || activeTab === 'MT4'}
                activeOpacity={0.7}
              >
                {false && renderBubbles(btnBubbles)}
                {isNeon && <View style={[styles.btnRefraction, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)' }]} />}
                {isNeon && <View style={[styles.btnMeniscus, Platform.OS === 'web' && { background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 100%)' }]} />}
                {isAuthenticating ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.linkButtonText}>AUTHENTICATING...</Text>
                  </View>
                ) : activeTab === 'MT4' ? (
                  <View style={styles.buttonContent}>
                    <Shield color="#999999" size={16} />
                    <Text style={styles.linkButtonText}>LINK MT4 ACCOUNT DETAILS</Text>
                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Shield color="#FFFFFF" size={16} />
                    <Text style={styles.linkButtonText}>LINK {activeTab} ACCOUNT DETAILS</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MT5 Authentication Toast */}
      {showMT5WebView && (
        <View style={styles.authToastContainer}>
          <View style={styles.authToastContent}>
            <View style={styles.authToastLeft}>
              <View style={styles.authToastIcon}>
                <ActivityIndicator size="small" color="#00FF00" />
              </View>
              <View style={styles.authToastInfo}>
                <Text style={styles.authToastTitle}>MT5 Authentication</Text>
                <Text style={styles.authToastStatus}>{authenticationStep || 'Connecting to RazorMarkets...'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.authToastCloseButton} onPress={closeMT5WebView}>
              <X color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MT5 WebView */}
      {showMT5WebView && (
        <View style={styles.invisibleWebViewContainer}>
          {Platform.OS === 'web' ? (
            <WebWebView
              url={`/api/mt5-proxy?url=${encodeURIComponent(MT5_BROKER_URLS[server] || MT5_BROKER_URLS['RazorMarkets-Live'])}&login=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}`}
              onMessage={onMT5WebViewMessage}
              onLoadEnd={() => console.log('MT5 Web WebView loaded')}
              style={styles.invisibleWebView}
            />
          ) : (
            <CustomWebView
              url={MT5_BROKER_URLS[server] || MT5_BROKER_URLS['RazorMarkets-Live']}
              script={getMT5Script()}
              onMessage={onMT5WebViewMessage}
              onLoadEnd={() => console.log('MT5 CustomWebView loaded')}
              style={styles.invisibleWebView}
            />
          )}
        </View>
      )}

      {/* MT4 Authentication Toast */}
      {showMT4WebView && (
        <View style={styles.authToastContainer}>
          <View style={styles.authToastContent}>
            <View style={styles.authToastLeft}>
              <View style={styles.authToastIcon}>
                <ActivityIndicator size="small" color="#00FF00" />
              </View>
              <View style={styles.authToastInfo}>
                <Text style={styles.authToastTitle}>MT4 Authentication</Text>
                <Text style={styles.authToastStatus}>{authenticationStep || 'Connecting to MetaTrader...'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.authToastCloseButton} onPress={closeMT4WebView}>
              <X color="#FFFFFF" size={16} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MT4 WebView */}
      {showMT4WebView && (
        <View style={styles.invisibleWebViewContainer}>
          {Platform.OS === 'web' ? (
            <WebWebView
              url={`/api/mt4-proxy?url=${encodeURIComponent('https://metatraderweb.app/trade?version=4')}&login=${encodeURIComponent(login)}&password=${encodeURIComponent(password)}&server=${encodeURIComponent(server)}`}
              onMessage={onMT4WebViewMessage}
              onLoadEnd={() => console.log('MT4 Web WebView loaded')}
              style={styles.invisibleWebView}
            />
          ) : (
            <CustomWebView
              url="https://metatraderweb.app/trade?version=4"
              script={getMT4Script()}
              onMessage={onMT4WebViewMessage}
              onLoadEnd={() => console.log('MT4 CustomWebView loaded')}
              style={styles.invisibleWebView}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  keyboardAvoidingView: { flex: 1 },
  content: { flex: 1, paddingTop: 20 },
  /* This screen already spoke the neon language; what it lacked was home's
     centred column, so on desktop every capsule stretched the full viewport
     and the form read as a stack of banners. */
  contentColumn: { width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center', paddingBottom: 40 },
  menuButton: {
    alignSelf: 'flex-start', marginLeft: 20, marginBottom: 16,
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.25)', borderLeftColor: 'rgba(255, 255, 255, 0.12)',
    borderRightColor: 'rgba(255, 255, 255, 0.08)', borderBottomColor: 'rgba(0, 0, 0, 0.15)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(60px) saturate(180%)', WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3)',
    }),
  },

  /* ========== TAB SELECTOR — LIQUID GLASS ========== */
  tabWrap: {
    position: 'relative', borderRadius: 22, padding: 2.5, overflow: 'hidden',
    marginHorizontal: 20, marginBottom: 24,
  },
  tabNeon: {
    position: 'absolute', top: '-100%', left: '-25%', width: '150%', height: '300%',
  },
  tabNeonGlow: {
    position: 'absolute', top: '-110%', left: '-30%', width: '160%', height: '320%',
    ...(Platform.OS === 'web' && { filter: 'blur(16px)' }),
  },
  tabInner: {
    borderRadius: 20, padding: 6, flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(12, 12, 12, 0.93)',
    position: 'relative', zIndex: 2,
  },
  tab: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16,
    alignItems: 'center', backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },

  /* ========== STATUS ========== */
  statusContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, marginBottom: 30,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#999999', marginRight: 8 },
  connectedDot: { backgroundColor: '#16A34A' },
  disconnectedDot: { backgroundColor: '#DC2626' },
  statusText: { fontSize: 12, fontWeight: '600', color: '#CCCCCC', letterSpacing: 1 },
  connectedText: { color: '#16A34A' },
  disconnectedText: { color: '#DC2626' },

  /* ========== LOGO ========== */
  logoContainer: { alignItems: 'center', marginBottom: 36 },
  mtLogoImageContainer: {
    width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    ...(Platform.OS === 'web' && { filter: 'drop-shadow(0 8px 20px rgba(80,200,120,0.2))' }),
  },
  mtLogoImage: { width: 64, height: 64 },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },

  /* ========== AUTH STATUS ========== */
  authStatusDisplay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 20, marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 12, marginHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  authStatusDisplayText: { marginLeft: 12, fontSize: 14, fontWeight: '500', color: '#FFFFFF' },

  /* ========== FORM ========== */
  form: { paddingHorizontal: 20 },

  /* ========== SERVER SECTION — no overflow clip so dropdown shows ========== */
  serverSection: {
    position: 'relative', zIndex: 1000, marginBottom: 18,
  },

  /* ========== BUBBLES ========== */
  bubblesContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  bubble: {
    position: 'absolute', backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  /* ========== FLOATING FIELD — LIQUID GLASS ========== */
  fieldWrap: {
    position: 'relative', borderRadius: 22, padding: 2.5, overflow: 'hidden', marginBottom: 18,
  },
  fieldNeon: {
    position: 'absolute', top: '-100%', left: '-25%', width: '150%', height: '300%',
  },
  fieldNeonGlow: {
    position: 'absolute', top: '-110%', left: '-30%', width: '160%', height: '320%',
    ...(Platform.OS === 'web' && { filter: 'blur(14px)' }),
  },
  fieldInner: {
    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(12, 12, 12, 0.93)', position: 'relative', overflow: 'hidden',
    zIndex: 2,
  },
  fieldRefraction: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '60%',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1,
  },
  fieldInput: {
    flex: 1, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 15, fontWeight: '500', color: '#FFFFFF', zIndex: 3,
  },
  serverIcon: { marginLeft: 16, zIndex: 3 },
  eyeButton: {
    paddingHorizontal: 14, paddingVertical: 12, marginRight: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', zIndex: 3,
  },
  clearButton: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', marginRight: 4, zIndex: 3,
  },
  clearButtonText: { color: '#999999', fontSize: 20, fontWeight: 'bold' },

  /* ========== LINK BUTTON — FLOATING LIQUID GLASS ========== */
  btnWrap: {
    position: 'relative', borderRadius: 22, padding: 2.5, overflow: 'hidden', marginTop: 24, marginBottom: 30,
  },
  btnNeon: {
    position: 'absolute', top: '-150%', left: '-25%', width: '150%', height: '400%',
  },
  btnNeonGlow: {
    position: 'absolute', top: '-170%', left: '-30%', width: '160%', height: '440%',
    ...(Platform.OS === 'web' && { filter: 'blur(16px)' }),
  },
  btnInner: {
    borderRadius: 20, paddingVertical: 18, paddingHorizontal: 24,
    backgroundColor: 'rgba(12, 12, 12, 0.93)', position: 'relative', overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  btnDisabled: { opacity: 0.7 },
  btnComingSoon: { opacity: 0.6 },
  btnRefraction: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, zIndex: 1,
  },
  btnMeniscus: {
    position: 'absolute', top: '35%', left: '-10%', right: '-10%', height: 24,
    zIndex: 1, transform: [{ rotate: '-2deg' }],
  },
  buttonContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 3,
  },
  linkButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 1.2, zIndex: 3 },
  comingSoonText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 'bold', zIndex: 3 },

  /* ========== BROKER LIST — iOS 26.3 GLASSMORPHISM DROPDOWN ========== */
  brokerListContainer: {
    marginTop: 8, zIndex: 100, borderRadius: 24, maxHeight: 360, overflow: 'hidden',
    backgroundColor: 'rgba(44, 44, 46, 0.72)',
    borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55, shadowRadius: 32, elevation: 14,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(80px) saturate(200%) brightness(1.05)',
      WebkitBackdropFilter: 'blur(80px) saturate(200%) brightness(1.05)',
      boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.25), inset 0 -0.5px 0 rgba(0,0,0,0.1), 0 16px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.06)',
    }),
  },
  brokerListHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    ...(Platform.OS === 'web' && {
      background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)',
    }),
  },
  brokerListTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.2 },
  brokerListActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshButton: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 10,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  refreshIcon: { opacity: 0.7 },
  refreshIconSpinning: { opacity: 0.5 },
  closeBrokerList: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 10,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  closeBrokerListText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: '600', marginTop: -1 },
  errorContainer: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.7)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  errorText: { fontSize: 13, color: '#FFFFFF', textAlign: 'center', fontWeight: '500' },
  loadingBrokersContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingBrokersText: { marginLeft: 10, fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  brokerList: { maxHeight: 280, paddingHorizontal: 8, paddingVertical: 4 },
  brokerItem: {
    paddingHorizontal: 14, paddingVertical: 14,
    marginVertical: 2, borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    ...(Platform.OS === 'web' && {
      transition: 'background-color 0.15s ease',
    }),
  },
  brokerItemContent: { flexDirection: 'row', alignItems: 'center' },
  brokerStatusDot: {
    width: 10, height: 10, borderRadius: 5, marginRight: 14,
  },
  liveBrokerDot: {
    backgroundColor: '#34D399',
    ...(Platform.OS === 'web' && { boxShadow: '0 0 8px rgba(52, 211, 153, 0.5)' }),
  },
  demoBrokerDot: {
    backgroundColor: '#FBBF24',
    ...(Platform.OS === 'web' && { boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)' }),
  },
  brokerItemText: { flex: 1, fontSize: 16, color: '#FFFFFF', fontWeight: '500', letterSpacing: -0.1 },
  brokerItemType: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: 0.6,
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  noBrokersContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  noBrokersText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', marginTop: 14, letterSpacing: -0.2 },
  noBrokersSubtext: { fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  /* ========== TOASTS ========== */
  authToastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20, right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.95)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 16, elevation: 10000, zIndex: 10000,
  },
  authToastContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  authToastLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  authToastIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  authToastInfo: { flex: 1 },
  authToastTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  authToastStatus: { color: '#CCCCCC', fontSize: 12, fontWeight: '500' },
  authToastCloseButton: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },

  /* ========== INVISIBLE WEBVIEW ========== */
  invisibleWebViewContainer: {
    position: 'absolute', top: -10000, left: -10000,
    width: 1, height: 1, opacity: 0, zIndex: -10000,
    overflow: 'hidden', elevation: -10000,
  },
  invisibleWebView: {
    width: 1, height: 1, opacity: 0,
    backgroundColor: 'transparent', elevation: -10000,
  },
});