import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { WATER_DAILY_TARGET_ML } from '@/constants/schedule';

const QUICK_AMOUNTS = [150, 250, 375, 500];
const WATER_COLOR = '#91A4C7';

interface Props {
  totalMl: number;
  onAdd: (ml: number) => void;
}

export function WaterProgress({ totalMl, onAdd }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const pct       = Math.min(1, totalMl / WATER_DAILY_TARGET_ML);
  const remaining = Math.max(0, WATER_DAILY_TARGET_ML - totalMl);
  const isGoalMet = pct >= 1;
  const barColor  = isGoalMet ? colors.success : WATER_COLOR;
  const customRef = useRef('');
  const inputRef  = useRef<TextInput>(null);

  // Animated fill bar — springs to current percentage whenever totalMl changes
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: pct,
      tension: 55,
      friction: 14,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  const barWidth = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // Count-up animation on the displayed number
  const prevRef   = useRef(totalMl);
  const countAnim = useRef(new Animated.Value(totalMl)).current;
  const [displayVal, setDisplayVal] = useState(totalMl);
  useEffect(() => {
    if (totalMl === prevRef.current) return;
    const from = prevRef.current;
    prevRef.current = totalMl;
    countAnim.setValue(from);
    countAnim.addListener(({ value }) => {
      setDisplayVal(Math.round(value));
    });
    Animated.spring(countAnim, { toValue: totalMl, tension: 60, friction: 14, useNativeDriver: false }).start(() => {
      countAnim.removeAllListeners();
      setDisplayVal(totalMl);
    });
  }, [totalMl]);

  // Shimmer sweep on fill bar
  const shimmer = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const run = () => {
      shimmer.setValue(-1);
      Animated.timing(shimmer, { toValue: 2, duration: 1400, useNativeDriver: true }).start(() => {
        setTimeout(run, 1200);
      });
    };
    const t = setTimeout(run, 800);
    return () => clearTimeout(t);
  }, []);
  const shimmerX = shimmer.interpolate({ inputRange: [-1, 2], outputRange: [-60, 220] });

  function submitCustom() {
    const ml = parseInt(customRef.current, 10);
    if (!ml || ml <= 0 || ml > 5000) return;
    onAdd(ml);
    inputRef.current?.clear();
    customRef.current = '';
  }

  const displayUnit = totalMl >= 1000 ? 'L' : 'ml';

  return (
    <View style={s.wrap}>
      {/* ── Hero card ── */}
      <View style={[s.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Number row */}
        <View style={s.metricRow}>
          <Text style={[s.metricNum, { color: colors.text, fontFamily: Fonts.display }]}>
            {totalMl >= 1000 ? (displayVal / 1000).toFixed(1) : String(displayVal)}
          </Text>
          <Text style={[s.metricUnit, { color: WATER_COLOR, fontFamily: Fonts.display }]}>
            {displayUnit}
          </Text>
          <View style={s.metricRight}>
            <Text style={[s.targetLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>
              goal
            </Text>
            <Text style={[s.targetNum, { color: colors.muted, fontFamily: Fonts.display }]}>
              {(WATER_DAILY_TARGET_ML / 1000).toFixed(1)}L
            </Text>
          </View>
        </View>

        {/* Animated progress bar with shimmer */}
        <View style={[s.barTrack, { backgroundColor: colors.elevated }]}>
          <Animated.View style={[s.barFill, { width: barWidth, backgroundColor: barColor, overflow: 'hidden' }]}>
            <Animated.View style={[s.shimmer, { transform: [{ translateX: shimmerX }] }]} />
          </Animated.View>
        </View>

        <Text style={[s.statusText, { color: isGoalMet ? colors.success : colors.muted, fontFamily: Fonts.body }]}>
          {isGoalMet ? 'Daily goal reached' : `${remaining} ml to go`}
        </Text>
      </View>

      {/* ── Quick-add buttons ── */}
      <View style={s.quickRow}>
        {QUICK_AMOUNTS.map((ml) => (
          <QuickBtn key={ml} ml={ml} barColor={barColor} colors={colors} onPress={() => onAdd(ml)} />
        ))}
      </View>

      {/* ── Custom amount ── */}
      <View style={[s.customRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          ref={inputRef}
          style={[s.customInput, { color: colors.text, fontFamily: Fonts.body }]}
          placeholder="Custom ml"
          placeholderTextColor={colors.placeholder}
          keyboardType="numeric"
          onChangeText={(t) => { customRef.current = t; }}
          returnKeyType="done"
          onSubmitEditing={submitCustom}
          maxLength={4}
        />
        <Pressable onPress={submitCustom}>
          <View style={[s.customBtn, { backgroundColor: WATER_COLOR }]}>
            <Text style={[s.customBtnText, { fontFamily: Fonts.body }]}>Add</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function QuickBtn({
  ml,
  barColor,
  colors,
  onPress,
}: {
  ml: number;
  barColor: string;
  colors: (typeof import('@/constants/Colors').default)['dark'];
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press   = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 80, bounciness: 2 }).start();
  const release = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 6 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={press} onPressOut={release} style={{ flex: 1 }}>
      <Animated.View
        style={[
          s.quickBtn,
          {
            backgroundColor: barColor + '14',
            borderColor: barColor + '28',
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[s.quickAmt, { color: barColor, fontFamily: Fonts.display }]}>+{ml}</Text>
        <Text style={[s.quickMl,  { color: barColor + 'AA', fontFamily: Fonts.body }]}>ml</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },

  hero: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    marginBottom: 10,
  },

  metricRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  metricNum: {
    fontSize: 56,
    letterSpacing: -2.5,
    lineHeight: 60,
  },
  metricUnit: {
    fontSize: 24,
    letterSpacing: -0.5,
    marginLeft: 5,
    marginBottom: 6,
  },
  metricRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  targetLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  targetNum: {
    fontSize: 18,
    letterSpacing: -0.5,
  },

  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.30)',
    transform: [{ skewX: '-20deg' }],
  },

  statusText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  quickAmt: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  quickMl: {
    fontSize: 11,
    marginTop: 1,
  },

  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  customBtn: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  customBtnText: {
    color: '#F4F5F7',
    fontSize: 14,
    fontWeight: '600',
  },
});
