import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, Component, ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "@/providers/app-provider";
import { ThemeProvider, useTheme, GOOGLE_FONTS_URL } from "@/providers/theme-provider";
import { SidebarProvider } from "@/providers/sidebar-provider";
import { View, Platform, Text, TouchableOpacity, StyleSheet, AppState } from "react-native";
import { DynamicIsland } from "@/components/dynamic-island";
import { RobotLogo } from "@/components/robot-logo";
import { TradingWebView } from "@/components/trading-webview";
import { CustomLoadingScreen } from "@/components/custom-loading-screen";
import { AddToHomePrompt } from "@/components/add-to-home";

// Early console suppression - must be at the very top
if (typeof window !== 'undefined' && Platform.OS === 'web') {
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;

  function shouldSuppress(message) {
    return message.includes('interactive-widget') ||
      message.includes('viewport') ||
      message.includes('Viewport argument key') ||
      message.includes('AES-CBC') ||
      message.includes('AES-CTR') ||
      message.includes('AES-GCM') ||
      message.includes('chosen-ciphertext') ||
      message.includes('authentication by default') ||
      message.includes('not recognized and ignored') ||
      message.includes('We recommended using authenticated encryption') ||
      message.includes('implementing it manually can result in minor') ||
      message.includes('serious mistakes') ||
      message.includes('protect against chosen-ciphertext attacks') ||
      message.includes('do not provide authentication by default') ||
      message.includes('can result in minor, but serious mistakes') ||
      message.includes('We recommended using') ||
      message.includes('authenticated encryption like AES-GCM');
  }

  console.warn = function (...args) {
    const message = args.join(' ');
    if (shouldSuppress(message)) return;
    originalWarn.apply(console, args);
  };

  console.error = function (...args) {
    const message = args.join(' ');
    if (shouldSuppress(message)) return;
    originalError.apply(console, args);
  };

  console.log = function (...args) {
    const message = args.join(' ');
    if (shouldSuppress(message)) return;
    originalLog.apply(console, args);
  };
}

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary componentDidCatch:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <RobotLogo size={80} />
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            The app encountered an error. Please restart the app.
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

function RootLayoutNav() {
  const {
    isFirstTime,
    eas,
    isBotActive,
    isBotStarting,
    newSignal,
    dismissNewSignal,
    tradingSignal,
    showTradingWebView,
    setShowTradingWebView
  } = useApp();
  const { fontFamilyCSS, textCaseCSS } = useTheme();
  const [appState, setAppState] = useState<string>(AppState.currentState);

  // Inject Google Fonts + override RN Web's inline font: '14px System' on <Text>
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // 1. Load Google Fonts (once)
    const linkId = 'ea_naptune-google-fonts';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }

    // 2. Inject/update <style> that overrides RN Web's inline font shorthand
    const styleId = 'ea_naptune-font-override';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      [data-testid], div[class*="css-text"], span[class*="css-text"],
      div[style*="font:"], span[style*="font:"] {
        font-family: ${fontFamilyCSS} !important;
      }
      /* Broader override for all RN Web text elements */
      * {
        font-family: ${fontFamilyCSS} !important;
        text-transform: ${textCaseCSS} !important;
      }
    `;
  }, [fontFamilyCSS, textCaseCSS]);

  // Debug TradingWebView state changes
  useEffect(() => {
    console.log('Root Layout - TradingWebView state changed:', {
      visible: showTradingWebView,
      hasSignal: !!tradingSignal,
      signalAsset: tradingSignal?.asset,
      signalAction: tradingSignal?.action
    });
  }, [showTradingWebView, tradingSignal]);

  // Handle app state changes for overlay persistence
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('Root Layout: App state changed from', appState, 'to', nextAppState);
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="license" />
        <Stack.Screen name="trade-config" options={{ presentation: "modal" }} />
      </Stack>
      {/* Shows while the bot runs, and from the moment TRADE is pressed so the
          island is up during the start rather than appearing after it. */}
      <DynamicIsland
        visible={!isFirstTime && eas.length > 0 && (isBotActive || isBotStarting)}
        newSignal={newSignal}
        onSignalDismiss={dismissNewSignal}
      />

      {/* Save to Home Screen prompt — disabled per request (no auto popup) */}
      {/* <AddToHomePrompt /> */}

      {/* Trading WebView Modal */}
      <TradingWebView
        visible={showTradingWebView}
        signal={tradingSignal}
        onClose={() => {
          console.log('TradingWebView onClose called');
          setShowTradingWebView(false);
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState<boolean>(false);

  useEffect(() => {
    // Set up comprehensive console warning filter for external warnings
    if (Platform.OS === 'web') {
      const originalWarn = console.warn;
      const originalError = console.error;
      const originalLog = console.log;

      // Filter console.warn
      console.warn = (...args) => {
        const message = args.join(' ');
        // Suppress warnings from external terminals and dependencies
        if (message.includes('interactive-widget') ||
          message.includes('viewport') ||
          message.includes('Viewport argument key') ||
          message.includes('AES-CBC') ||
          message.includes('AES-CTR') ||
          message.includes('AES-GCM') ||
          message.includes('chosen-ciphertext') ||
          message.includes('authentication by default') ||
          message.includes('not recognized and ignored') ||
          message.includes('We recommended using authenticated encryption') ||
          message.includes('implementing it manually can result in minor') ||
          message.includes('serious mistakes') ||
          message.includes('protect against chosen-ciphertext attacks') ||
          message.includes('do not provide authentication by default') ||
          message.includes('can result in minor, but serious mistakes') ||
          message.includes('We recommended using') ||
          message.includes('authenticated encryption like AES-GCM')) {
          return;
        }
        originalWarn.apply(console, args);
      };

      // Filter console.error for the same warnings
      console.error = (...args) => {
        const message = args.join(' ');
        // Suppress error messages from external terminals and dependencies
        if (message.includes('interactive-widget') ||
          message.includes('viewport') ||
          message.includes('Viewport argument key') ||
          message.includes('AES-CBC') ||
          message.includes('AES-CTR') ||
          message.includes('AES-GCM') ||
          message.includes('chosen-ciphertext') ||
          message.includes('authentication by default') ||
          message.includes('not recognized and ignored') ||
          message.includes('We recommended using authenticated encryption') ||
          message.includes('implementing it manually can result in minor') ||
          message.includes('serious mistakes') ||
          message.includes('protect against chosen-ciphertext attacks') ||
          message.includes('do not provide authentication by default') ||
          message.includes('can result in minor, but serious mistakes') ||
          message.includes('We recommended using') ||
          message.includes('authenticated encryption like AES-GCM')) {
          return;
        }
        originalError.apply(console, args);
      };

      // Filter console.log for terminal warnings
      console.log = (...args) => {
        const message = args.join(' ');
        // Suppress log messages from external terminals and dependencies
        if (message.includes('interactive-widget') ||
          message.includes('viewport') ||
          message.includes('Viewport argument key') ||
          message.includes('AES-CBC') ||
          message.includes('AES-CTR') ||
          message.includes('AES-GCM') ||
          message.includes('chosen-ciphertext') ||
          message.includes('authentication by default') ||
          message.includes('not recognized and ignored') ||
          message.includes('We recommended using authenticated encryption') ||
          message.includes('implementing it manually can result in minor') ||
          message.includes('serious mistakes') ||
          message.includes('protect against chosen-ciphertext attacks') ||
          message.includes('do not provide authentication by default') ||
          message.includes('can result in minor, but serious mistakes') ||
          message.includes('We recommended using') ||
          message.includes('authenticated encryption like AES-GCM')) {
          return;
        }
        originalLog.apply(console, args);
      };
    }

    async function prepare() {
      try {
        // Keep the splash screen visible while we fetch resources
        await SplashScreen.preventAutoHideAsync();

        // Pre-load any resources or data here if needed
        // Reduce loading time on Render
        const isRender = process.env.RENDER === 'true';
        const loadTime = isRender ? 100 : 200; // Faster loading on Render
        await new Promise(resolve => setTimeout(resolve, loadTime));

      } catch (e) {
        console.warn('Error during app preparation:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (hideError) {
          console.warn('Error hiding splash screen:', hideError);
        }
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return <CustomLoadingScreen message="Initializing EA NAPTUNE..." />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <SidebarProvider>
      <AppProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
          <StatusBar style="light" backgroundColor="#000000" translucent={false} />
          <RootLayoutNav />
        </GestureHandlerRootView>
      </AppProvider>
      </SidebarProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}