import { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
}

// Floating AI mic button — no background bar, floats over content.
export function AICommandBar({ isLoading }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const router = useRouter();

  // Press spring
  const scale = useRef(new Animated.Value(1)).current;
  const press   = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 60, bounciness: 3 }).start();
  const release = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 30, bounciness: 8 }).start();

  // Outer ring pulse — breathes when idle
  const ringScale   = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1.35, duration: 1400, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0,    duration: 1400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale,   { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Inner shimmer shimmy — subtle rotation of an inner arc
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 3200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 3200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.20, 0.55, 0.20] });

  const ringColor = colors.primary;

  return (
    <View style={s.container} pointerEvents="box-none">
      <Pressable
        onPress={() => router.push('/(main)/ai' as any)}
        onPressIn={press}
        onPressOut={release}
        disabled={isLoading}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Outer pulse ring */}
        <Animated.View
          pointerEvents="none"
          style={[
            s.ring,
            {
              borderColor: 'rgba(145,164,199,0.70)',
              transform: [{ scale: ringScale }],
              opacity: isLoading ? 0 : ringOpacity,
            },
          ]}
        />

        <Animated.View
          style={[
            s.circle,
            {
              backgroundColor: 'rgba(18,22,28,0.85)',
              borderColor: 'rgba(145,164,199,0.30)',
              opacity: isLoading ? 0.5 : 1,
              transform: [{ scale }],
            },
          ]}
        >
          {/* Inner shimmer arc */}
          <Animated.View
            pointerEvents="none"
            style={[s.innerArc, { borderColor: colors.primary, opacity: shimmerOpacity }]}
          />
          <MicIcon color={colors.primary} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

function MicIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 30, height: 38, alignItems: 'center', justifyContent: 'center' }}>
      {/* Capsule body */}
      <View style={{
        width: 15, height: 24, borderRadius: 8,
        borderWidth: 2, borderColor: color,
        position: 'absolute', top: 0,
      }} />
      {/* Stand */}
      <View style={{
        width: 2, height: 10, borderRadius: 1,
        backgroundColor: color, position: 'absolute', bottom: 0,
      }} />
      {/* Crossbar at stand base */}
      <View style={{
        width: 10, height: 2, borderRadius: 1,
        backgroundColor: color, position: 'absolute', bottom: 0,
      }} />
      {/* Arc */}
      <View style={{
        width: 24, height: 13,
        borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderTopWidth: 0,
        borderBottomLeftRadius: 13, borderBottomRightRadius: 13,
        borderColor: color,
        position: 'absolute', bottom: 10,
      }} />
    </View>
  );
}

const CIRCLE_SIZE = 80;

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    // Sit above the floating tab bar (tab bar: bottom 28/16 + height 64)
    paddingBottom: Platform.OS === 'ios' ? 104 : 90,
  },
  ring: {
    position: 'absolute',
    width: CIRCLE_SIZE + 16,
    height: CIRCLE_SIZE + 16,
    borderRadius: (CIRCLE_SIZE + 16) / 2,
    borderWidth: 1.5,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 18,
  },
  innerArc: {
    position: 'absolute',
    width: CIRCLE_SIZE - 8,
    height: CIRCLE_SIZE - 8,
    borderRadius: (CIRCLE_SIZE - 8) / 2,
    borderWidth: 1,
    top: 3,
    left: 3,
  },
});
