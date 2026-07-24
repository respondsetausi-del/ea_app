import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { CandleLogo } from './candle-logo';

const ACCENT = '#0A84FF';

interface CustomLoadingScreenProps {
    message?: string;
}

export function CustomLoadingScreen({ message = "Loading EA NAPTUNE..." }: CustomLoadingScreenProps) {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoTile}>
                    <CandleLogo size={84} color={ACCENT} />
                </View>
                <Text style={styles.title}>EA NAPTUNE</Text>
                <Text style={styles.message}>{message}</Text>

                {/* Loading dots animation */}
                <View style={styles.loadingContainer}>
                    <View style={[styles.dot, styles.dot1]} />
                    <View style={[styles.dot, styles.dot2]} />
                    <View style={[styles.dot, styles.dot3]} />
                </View>

                <Text style={styles.subtitle}>
                    {Platform.OS === 'web' ? 'Preparing your trading environment...' : 'Initializing...'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      backgroundImage: 'linear-gradient(135deg, rgba(10, 132, 255, 0.9) 0%, rgba(10, 132, 255, 0.5) 30%, rgba(10, 132, 255, 0.1) 65%, rgba(0, 0, 0, 0.95) 90%, rgba(0, 0, 0, 1) 100%)',
    }),
  },
    content: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    logoTile: {
        width: 120,
        height: 120,
        borderRadius: 24,
        backgroundColor: '#050505',
        alignItems: 'center',
        justifyContent: 'center',
        ...(Platform.OS === 'web' && {
          boxShadow: '0 0 26px rgba(10, 132, 255, 0.55)',
        }),
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: ACCENT,
        marginTop: 24,
        letterSpacing: 3,
        textShadowColor: ACCENT,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
        textAlign: 'center',
        ...(Platform.OS === 'web' && {
          filter: 'drop-shadow(0 0 10px rgba(10, 132, 255, 0.6))',
        }),
    },
    message: {
        fontSize: 16,
        color: '#CCCCCC',
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 32,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: ACCENT,
        marginHorizontal: 6,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    dot1: {
        opacity: 0.4,
    },
    dot2: {
        opacity: 0.7,
    },
    dot3: {
        opacity: 1,
    },
    subtitle: {
        fontSize: 14,
        color: '#888888',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
