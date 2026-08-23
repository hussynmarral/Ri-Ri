import { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;
  radius?: number;
  noBorder?: boolean;
}

// Dark neutral glass card — neutral gray surface, white/ice-blue edge lighting.
export function GlassCard({ children, style, radius = 20, noBorder }: Props) {
  const scheme  = useColorScheme() ?? 'dark';
  const colors  = Colors[scheme];
  const isDark  = scheme === 'dark';
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isDark || noBorder) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 3600, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 3600, useNativeDriver: true }),
        Animated.delay(700),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isDark, noBorder]);

  const shimmerOpacity = shimmer;

  return (
    <View
      style={[
        s.shadow,
        {
          borderRadius: radius,
          shadowColor: isDark ? '#000000' : '#12161C',
          shadowOpacity: isDark ? 0.60 : 0.12,
          shadowRadius: isDark ? 20 : 8,
          shadowOffset: { width: 0, height: isDark ? 8 : 2 },
          elevation: isDark ? 12 : 3,
        },
        style,
      ]}
    >
      <View
        style={[
          s.base,
          {
            borderRadius: radius,
            backgroundColor: colors.surface,
            borderColor: noBorder ? 'transparent' : colors.glassBorder,
          },
        ]}
      >
        {/* Animated border shimmer — ice-blue glow that breathes on the glass edge */}
        {!noBorder && isDark && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: radius - 1,
                borderWidth: 1,
                borderColor: 'rgba(174,187,209,0.15)',
                opacity: shimmerOpacity,
              },
            ]}
          />
        )}
        {/* Top edge — bright white light catching the glass rim */}
        {!noBorder && isDark && (
          <View
            pointerEvents="none"
            style={[s.topEdge, {
              borderTopLeftRadius: radius - 1,
              borderTopRightRadius: radius - 1,
            }]}
          />
        )}
        {/* Top-left refraction — very faint ice-blue inner highlight */}
        {!noBorder && (
          <View
            pointerEvents="none"
            style={[
              s.innerHighlight,
              {
                borderRadius: radius,
                borderColor: isDark
                  ? colors.glassInner
                  : 'rgba(255,255,255,0.80)',
              },
            ]}
          />
        )}
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shadow: {},
  base: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  // Very thin bright line at the top rim of the card — light catching glass
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 1,
    borderBottomColor: 'transparent',
    borderRightColor:  'transparent',
    zIndex: 1,
    pointerEvents: 'none',
  },
});
