/**
 * The capsule card from the home screen, as a component.
 *
 * A card is two layers: a wrapper holding the accent rim, and an inner face
 * inset by the rim's width. When `ring` is set the rim is a rotating conic
 * gradient; otherwise it's a static bloom, which is what most cards should
 * use — home reserves the spinning ring for the one live element on screen,
 * and a list of forty rows each running its own animation would spend the
 * frame budget on decoration.
 *
 * All the cards on a screen share one rotation so the rims stay in phase and
 * only one timing loop runs, however many cards mount.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Platform, TouchableOpacity, Easing } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme-provider';
import { ring, ringGlow, cardSurface, panelSurface, staticGlow, REFRACTION } from '@/constants/neon';

/** One rotation, shared by every NeonCard, started on first mount. */
const spin = new Animated.Value(0);
let spinning = false;
function startSpin() {
  if (spinning) return;
  spinning = true;
  Animated.loop(
    Animated.timing(spin, {
      toValue: 1,
      duration: 8000,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    })
  ).start();
}
const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

interface NeonCardProps {
  children: React.ReactNode;
  /** Corner radius of the inner face. The rim sits 2.5px outside it. */
  radius: number;
  /** Rotating rim instead of a static bloom. Use sparingly — see above. */
  ring?: boolean;
  /** 'solid' is near-black and always legible; 'glass' lets the page show through. */
  variant?: 'solid' | 'glass';
  /** Gloss across the top of the card. On by default. */
  gloss?: boolean;
  /** Applied to the inner face — padding, layout, and so on. */
  style?: StyleProp<ViewStyle>;
  /** Applied to the outer wrapper — margins, alignment, width. */
  wrapperStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  /** Overrides the theme accent — used for semantic states like "live". */
  accent?: { color: string; rgb: string };
}

export function NeonCard({
  children,
  radius,
  ring: animated = false,
  variant = 'solid',
  gloss = true,
  style,
  wrapperStyle,
  onPress,
  disabled,
  testID,
  accent,
}: NeonCardProps) {
  const { theme } = useTheme();
  const ac = accent?.color ?? theme.accent;
  const a = accent?.rgb ?? theme.accentRgb;
  const isWeb = Platform.OS === 'web';
  const mounted = useRef(false);

  useEffect(() => {
    if (animated && !mounted.current) {
      mounted.current = true;
      startSpin();
    }
  }, [animated]);

  const face = variant === 'solid' ? cardSurface(a) : panelSurface(a);

  const inner = (
    <>
      {gloss && isWeb && (
        <View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, height: '100%', borderRadius: radius, zIndex: 2 },
            { backgroundImage: REFRACTION } as any,
          ]}
        />
      )}
      {children}
    </>
  );

  const faceStyle: any = [
    {
      borderRadius: radius,
      position: 'relative',
      overflow: 'hidden',
      // Native gets a flat fill — backdrop-filter and layered box-shadows are
      // web-only, and without this the card would have no background at all.
      backgroundColor: variant === 'solid' ? 'rgba(12,12,12,0.93)' : 'rgba(255,255,255,0.035)',
    },
    isWeb && face,
    // Without the ring the card would have no edge at all, so it keeps a
    // hairline and a static bloom in the accent. Native never draws the ring
    // (conic-gradient is web-only), so it takes the border in either case —
    // tinted to the accent where the ring would have been.
    (!animated || !isWeb) && {
      borderWidth: 1,
      borderColor: animated ? 'rgba(' + a + ', 0.5)' : 'rgba(255,255,255,0.10)',
    },
    !animated && isWeb && ({ boxShadow: face.boxShadow + ', ' + staticGlow(a) } as any),
    style,
  ];

  return (
    <View
      style={[
        { position: 'relative', borderRadius: radius + 2.5, padding: animated ? 2.5 : 0, overflow: 'hidden' },
        wrapperStyle,
      ]}
    >
      {animated && isWeb && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: '-50%', left: '-25%', width: '150%', height: '200%' },
              { transform: [{ rotate: spinDeg }] },
              { backgroundImage: ringGlow(a), filter: 'blur(16px)' } as any,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: '-50%', left: '-25%', width: '150%', height: '200%' },
              { transform: [{ rotate: spinDeg }] },
              { backgroundImage: ring(ac, a) } as any,
            ]}
          />
        </>
      )}
      {onPress ? (
        <TouchableOpacity
          testID={testID}
          activeOpacity={0.75}
          onPress={onPress}
          disabled={disabled}
          style={faceStyle}
        >
          {inner}
        </TouchableOpacity>
      ) : (
        <View testID={testID} style={faceStyle}>
          {inner}
        </View>
      )}
    </View>
  );
}
