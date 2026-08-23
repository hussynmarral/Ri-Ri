import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { HabitKey } from '@/stores/habitStore';

export const HABIT_LABEL: Record<HabitKey, string> = {
  reading:     'Reading',
  english:     'English',
  turkish:     'Turkish',
  skincare:    'Skincare',
  haircare:    'Hair Care',
  supplements: 'Supplements',
};

export const HABIT_COLOR: Record<HabitKey, string> = {
  reading:     '#91A4C7',
  english:     '#596B89',
  turkish:     '#8993A3',
  skincare:    '#AEBBD1',
  haircare:    '#8993A3',
  supplements: '#596B89',
};

interface Props {
  habitKey: HabitKey;
  completed: boolean;
  onToggle: () => void;
  streak?: number;
  index?: number;
}

export function HabitRow({ habitKey, completed, onToggle, streak = 0, index = 0 }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const color  = HABIT_COLOR[habitKey];

  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    const delay = Math.min(index, 8) * 50;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const scale = useRef(new Animated.Value(1)).current;
  const press   = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 80, bounciness: 2 }).start();
  const release = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 6 }).start();

  const checkScale = useRef(new Animated.Value(completed ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: completed ? 1 : 0,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [completed]);

  // Color flash + expanding pulse ring when newly completed
  const flashAnim        = useRef(new Animated.Value(0)).current;
  const pulseRingScale   = useRef(new Animated.Value(0.3)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0)).current;
  const prevCompleted    = useRef(completed);
  useEffect(() => {
    if (completed && !prevCompleted.current) {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: false }).start();
      pulseRingScale.setValue(0.3);
      pulseRingOpacity.setValue(0.9);
      Animated.parallel([
        Animated.timing(pulseRingScale,   { toValue: 2.2, duration: 560, useNativeDriver: true }),
        Animated.timing(pulseRingOpacity, { toValue: 0,   duration: 560, useNativeDriver: true }),
      ]).start();
    }
    prevCompleted.current = completed;
  }, [completed]);
  const bgAnim = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [completed ? `${color}12` : colors.surface, `${color}45`],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable onPress={onToggle} onPressIn={press} onPressOut={release}>
        <Animated.View
          style={[
            s.row,
            {
              backgroundColor: bgAnim,
              borderColor: completed ? `${color}40` : colors.border,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={[s.accentBar, { backgroundColor: color }]} />

          <View style={{ flex: 1 }}>
            <Text
              style={[
                s.label,
                {
                  color: completed ? colors.textSecondary : colors.text,
                  fontFamily: Fonts.body,
                  textDecorationLine: completed ? 'line-through' : 'none',
                },
              ]}
            >
              {HABIT_LABEL[habitKey]}
            </Text>
            {streak > 1 && (
              <View style={[s.streakBadge, { backgroundColor: `${color}20`, borderColor: `${color}45` }]}>
                <Text style={[s.streakTxt, { color, fontFamily: Fonts.body }]}>
                  {streak}d
                </Text>
              </View>
            )}
          </View>

          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 24, height: 24, borderRadius: 12,
                borderWidth: 1.5, borderColor: color,
                opacity: pulseRingOpacity,
                transform: [{ scale: pulseRingScale }],
              }}
            />
            <View
              style={[
                s.checkbox,
                completed
                  ? { backgroundColor: color, borderColor: color }
                  : { backgroundColor: 'transparent', borderColor: colors.borderStrong },
              ]}
            >
              <Animated.View style={[s.tick, { transform: [{ scale: checkScale }] }]}>
                <View style={[s.tickShort, { backgroundColor: '#fff' }]} />
                <View style={[s.tickLong,  { backgroundColor: '#fff' }]} />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 7,
    gap: 14,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    height: 22,
    borderRadius: 2,
  },
  label: {
    fontSize: 16,
    letterSpacing: -0.1,
  },
  streakBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 3,
  },
  streakTxt: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickShort: {
    position: 'absolute',
    left: 1,
    bottom: 3,
    width: 5,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  tickLong: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 9,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },
});
