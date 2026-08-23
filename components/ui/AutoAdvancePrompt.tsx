// Shown when a scheduled block's end time arrives.
// User has 8 seconds to respond: "Done" or "Missed".
// After timeout → auto-marks completed.
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GlassCard } from './GlassCard';

const TIMEOUT_SECS = 8;

interface Props {
  blockTitle: string;
  visible: boolean;
  onDone:   () => void;   // user confirms they did it
  onMissed: () => void;   // user says they missed it
  onAuto:   () => void;   // auto-advance after timeout
}

export function AutoAdvancePrompt({ blockTitle, visible, onDone, onMissed, onAuto }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { width } = useWindowDimensions();
  const [secs, setSecs] = useState(TIMEOUT_SECS);
  const firedRef = useRef(false);
  const slideY   = useRef(new Animated.Value(120)).current;
  const opacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      firedRef.current = false;
      Animated.parallel([
        Animated.timing(slideY,  { toValue: 120, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
      return;
    }
    setSecs(TIMEOUT_SECS);
    Animated.parallel([
      Animated.spring(slideY,   { toValue: 0,  useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.timing(opacity,  { toValue: 1,  duration: 260, useNativeDriver: true }),
    ]).start();

    const countdown = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          if (!firedRef.current) {
            firedRef.current = true;
            onAuto();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [visible]);

  const pct = secs / TIMEOUT_SECS;

  return (
    <Animated.View
      style={[
        s.wrap,
        { transform: [{ translateY: slideY }], opacity, maxWidth: Math.min(width - 32, 420) },
      ]}
    >
      <GlassCard radius={24} style={s.card}>
        <View style={s.inner}>
          {/* Timeout arc bar */}
          <View style={[s.timerTrack, { backgroundColor: colors.elevated }]}>
            <View style={[s.timerFill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
          </View>

          <Text style={[s.q, { color: colors.textSecondary, fontFamily: Fonts.body }]}>
            Did you complete
          </Text>
          <Text style={[s.title, { color: colors.text, fontFamily: Fonts.display }]} numberOfLines={2}>
            {blockTitle}
          </Text>

          <Text style={[s.auto, { color: colors.placeholder }]}>
            Auto-advancing in {secs}s
          </Text>

          <View style={s.btnRow}>
            <Pressable
              onPress={() => { firedRef.current = true; onMissed(); }}
              style={({ pressed }) => [s.btn, s.missBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[s.btnTxt, { color: colors.muted, fontFamily: Fonts.body }]}>Missed</Text>
            </Pressable>
            <Pressable
              onPress={() => { firedRef.current = true; onDone(); }}
              style={({ pressed }) => [s.btn, s.doneBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[s.btnTxt, { color: '#AEBBD1', fontFamily: Fonts.bodyBold }]}>Done ✓</Text>
            </Pressable>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: '100%',
    zIndex: 200,
    paddingHorizontal: 16,
  },
  card:  { width: '100%' },
  inner: { padding: 22 },

  timerTrack: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 18 },
  timerFill:  { height: 3, borderRadius: 2 },

  q:     { fontSize: 13, letterSpacing: 0.1, marginBottom: 4 },
  title: { fontSize: 22, letterSpacing: -0.5, lineHeight: 28, marginBottom: 8 },
  auto:  { fontSize: 12, marginBottom: 20 },

  btnRow:   { flexDirection: 'row', gap: 10 },
  btn:      { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  missBtn:  { borderWidth: 1 },
  doneBtn:  {},
  btnTxt:   { fontSize: 15, letterSpacing: -0.1 },
});
