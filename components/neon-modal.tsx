/**
 * The app's popup shell.
 *
 * Every screen had rolled its own: `#0A0F1C` with a solid-accent button here,
 * `#0D1117` with a green one there, a grey glass card in Licence. They shared
 * no radius, no button shape, and no idea of what "primary" looks like.
 *
 * The card is the same opaque near-black face as the cards on the screens
 * behind it, with an accent rim and the page's blur over the backdrop. Buttons
 * are capsules, and the primary one is a dark capsule with accent text — not a
 * solid slab of accent, which is what made the old popups read as a different
 * product.
 */
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { INK, SIGNAL, cardSurface, radii, webPressable } from '@/constants/neon';

interface NeonModalProps {
  visible: boolean;
  onClose: () => void;
  /** Rendered in a ringed circle above the title. */
  icon?: React.ReactNode;
  title?: string;
  /** Body copy, centred under the title. */
  message?: string;
  /** Arbitrary content below the message — forms, lists, an iframe. */
  children?: React.ReactNode;
  /** Widen for content-heavy popups. Defaults to a message-sized card. */
  maxWidth?: number;
  /** Lets the card grow to fill the screen — for embedded web views. */
  fill?: boolean;
  /** Tap outside to dismiss. Off for anything mid-transaction. */
  dismissOnBackdrop?: boolean;
  testID?: string;
}

export function NeonModal({
  visible,
  onClose,
  icon,
  title,
  message,
  children,
  maxWidth = 380,
  fill = false,
  dismissOnBackdrop = true,
  testID,
}: NeonModalProps) {
  const { theme, cardShape } = useTheme();
  const a = theme.accentRgb;
  const R = radii(cardShape);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={dismissOnBackdrop ? onClose : undefined}
      >
        {/* Swallows taps so pressing the card itself doesn't dismiss it. */}
        <TouchableOpacity
          testID={testID}
          activeOpacity={1}
          onPress={() => {}}
          style={[
            styles.card,
            { maxWidth, borderColor: 'rgba(' + a + ', 0.35)' },
            // Popups keep a softer radius than the capsule cards: a true
            // capsule on a tall dialog bows the sides in.
            { borderRadius: Math.min(R.row, 28) },
            fill && styles.cardFill,
            Platform.OS === 'web' && (cardSurface(a) as any),
          ]}
        >
          {icon && (
            <View style={[styles.iconRing, { borderColor: theme.accent, backgroundColor: 'rgba(' + a + ', 0.13)' }]}>
              {icon}
            </View>
          )}
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

interface NeonModalButtonProps {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  testID?: string;
}

export function NeonModalButton({ label, onPress, kind = 'primary', disabled, testID }: NeonModalButtonProps) {
  const { theme, cardShape } = useTheme();
  const a = theme.accentRgb;
  const R = radii(cardShape);

  const tint =
    kind === 'danger'
      ? { bg: 'rgba(255, 69, 58, 0.10)', border: 'rgba(255, 69, 58, 0.4)', text: SIGNAL.sell }
      : { bg: 'rgba(' + a + ', 0.14)', border: 'rgba(' + a + ', 0.45)', text: theme.accent };

  if (kind === 'ghost') {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.7} style={[styles.ghost, webPressable]}>
        <Text style={styles.ghostText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.button,
        webPressable,
        { borderRadius: R.row, backgroundColor: tint.bg, borderColor: tint.border },
        disabled && styles.buttonDisabled,
        !disabled && Platform.OS === 'web' && ({ boxShadow: '0 0 16px rgba(' + a + ', 0.22)' } as any),
      ]}
    >
      <Text style={[styles.buttonText, { color: disabled ? INK.ghost : tint.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    ...(Platform.OS === 'web' && { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }),
  },
  card: {
    width: '100%',
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#0c0c0c',
    gap: 4,
  },
  cardFill: { flex: 1, marginVertical: 40, alignItems: 'stretch' },
  iconRing: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: {
    color: INK.primary, fontSize: 17, fontWeight: '800',
    letterSpacing: 1.2, marginBottom: 8, textAlign: 'center',
  },
  message: {
    color: INK.secondary, fontSize: 14, lineHeight: 21,
    textAlign: 'center', marginBottom: 22,
  },
  button: {
    width: '100%', paddingVertical: 15, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, marginTop: 4,
  },
  buttonDisabled: { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' },
  buttonText: { fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
  ghost: { paddingVertical: 12, paddingHorizontal: 20, marginTop: 6 },
  ghostText: { color: INK.faint, fontSize: 13, fontWeight: '600' },
});
