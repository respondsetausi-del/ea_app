import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Animated, Platform } from 'react-native';

/**
 * Text field whose label starts sitting in the input (doing the placeholder's
 * job) and floats up to a caption once the field is focused or filled.
 *
 * Shared by the login and license screens so both read as the same product.
 */
export function FloatingField({
  label,
  value,
  onChangeText,
  accentRgb,
  keyboardType,
  autoCapitalize = 'none',
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  accentRgb: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'characters';
  testID?: string;
}) {
  const [focused, setFocused] = useState<boolean>(false);
  const raised = focused || value.length > 0;
  const anim = useRef(new Animated.Value(raised ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: raised ? 1 : 0,
      duration: 160,
      // Animating fontSize/top/color — layout props the native driver can't take.
      useNativeDriver: false,
    }).start();
  }, [raised]);

  return (
    <View style={styles.inputGroup}>
      <View
        style={[
          styles.inputWrapper,
          focused && { borderColor: 'rgba(' + accentRgb + ', 0.55)' },
        ]}
      >
        <Animated.Text
          pointerEvents="none"
          style={[
            styles.floatingLabel,
            {
              top: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 8] }),
              fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
              color: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255, 255, 255, 0.35)', 'rgba(' + accentRgb + ', 0.95)'],
              }),
            },
          ]}
        >
          {label}
        </Animated.Text>
        <TextInput
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 20,
  },
  inputWrapper: {
    // Dark enough to hold its own against the bright end of the gradient,
    // since neither screen wraps the form in a card.
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingTop: 26,
    paddingBottom: 10,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    // Web-only: drop the browser focus ring; the accent border is the focus cue.
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
});
