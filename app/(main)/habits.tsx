import { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

// ── Circular arc ring ─────────────────────────────────────────────────────────

function lerpHex(a: string, b: string, t: number): string {
  const p = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
}

function ArcRing({ pct, color, size = 96, stroke = 7 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const half = size / 2;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: pct, tension: 55, friction: 14, useNativeDriver: false }).start();
  }, [pct]);

  const rot1 = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '180deg', '180deg'] });
  const rot2 = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '0deg', '180deg'] });
  const track = 'rgba(174,187,209,0.14)';
  // Gradient: color lerps toward a soft green as pct increases
  const ringColor = pct > 0.3 ? lerpHex(color, '#8BBFA0', Math.min(1, (pct - 0.3) / 0.7)) : color;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track ring */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: half, borderWidth: stroke, borderColor: track }} />
      {/* Right half fill (reveals first for 0→50%) */}
      <View style={{ position: 'absolute', top: 0, left: half, width: half, height: size, overflow: 'hidden' }}>
        <Animated.View style={{
          position: 'absolute', top: 0, left: -half,
          width: size, height: size, borderRadius: half,
          borderWidth: stroke, borderColor: ringColor, borderLeftColor: 'transparent',
          transform: [{ rotate: rot1 }],
        }} />
      </View>
      {/* Left half fill (reveals for 50→100%) */}
      <View style={{ position: 'absolute', top: 0, left: 0, width: half, height: size, overflow: 'hidden' }}>
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0,
          width: size, height: size, borderRadius: half,
          borderWidth: stroke, borderColor: ringColor, borderRightColor: 'transparent',
          transform: [{ rotate: rot2 }],
        }} />
      </View>
    </View>
  );
}

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { HabitRow } from '@/components/habits/HabitRow';
import { WeekGrid } from '@/components/habits/WeekGrid';
import { todayDateISO } from '@/lib/scheduler/engine';
import { useAuthStore } from '@/stores/authStore';
import { HABIT_KEYS, useHabitStore } from '@/stores/habitStore';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import type { HabitKey } from '@/stores/habitStore';

function last7Dates(today: string): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - i);
    const pad = (n: number) => String(n).padStart(2, '0');
    dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return dates;
}

export default function HabitsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const user = useAuthStore((s) => s.user);
  const { todayHabits, weekHabits, streaks: rawStreaks, overallStreak, load, loadWeek, markComplete, markIncomplete } = useHabitStore();
  const streaks = rawStreaks ?? {} as Record<string, number>;

  const date      = todayDateISO();
  const weekDates = useMemo(() => last7Dates(date), [date]);

  useEffect(() => {
    if (!user) return;
    load(user.id, date);
    loadWeek(user.id, weekDates);
  }, [user?.id, date, weekDates]);

  const completedCount = HABIT_KEYS.filter((k) => todayHabits[k]?.completed).length;
  const pct            = completedCount / HABIT_KEYS.length;
  const allDone        = completedCount === HABIT_KEYS.length;

  function toggle(key: HabitKey) {
    if (!user) return;
    if (todayHabits[key]?.completed) markIncomplete(user.id, key, date);
    else                              markComplete(user.id, key, date);
  }

  const barColor = allDone ? colors.success : colors.primary;

  return (
    <ScreenTransition>
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerSub,   { color: colors.muted, fontFamily: Fonts.body }]}>Today</Text>
        <Text style={[s.headerTitle, { color: colors.text, fontFamily: Fonts.display }]}>Habits</Text>
      </View>

      {/* ── Hero card ── */}
      <View style={[s.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.heroTop}>
          {/* Arc ring with count inside */}
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <ArcRing pct={pct} color={barColor} size={100} stroke={7} />
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Text style={[s.heroNum, { color: barColor, fontFamily: Fonts.display }]}>
                {completedCount}
              </Text>
              <Text style={[s.heroTotal, { color: colors.placeholder, fontFamily: Fonts.body }]}>
                /{HABIT_KEYS.length}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, paddingLeft: 20, justifyContent: 'center', gap: 8 }}>
            <Text style={[s.heroLabel, { color: colors.muted, fontFamily: Fonts.body }]}>
              {allDone ? 'All habits done!' : 'habits done today'}
            </Text>
            <Text style={[s.pctText, { color: allDone ? colors.success : colors.placeholder, fontFamily: Fonts.body }]}>
              {Math.round(pct * 100)}% complete
            </Text>
            {overallStreak > 0 && (
              <Text style={[s.pctText, { color: colors.primary, fontFamily: Fonts.body }]}>
                {overallStreak}d perfect streak
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── Today rows ── */}
      <Text style={[s.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>Today</Text>
      {HABIT_KEYS.map((key, i) => (
        <HabitRow
          key={key}
          habitKey={key}
          completed={!!todayHabits[key]?.completed}
          onToggle={() => toggle(key)}
          streak={streaks[key]}
          index={i}
        />
      ))}

      {/* ── This week ── */}
      <Text style={[s.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body, marginTop: 28 }]}>
        This Week
      </Text>
      <WeekGrid weekHabits={weekHabits} dates={weekDates} todayDate={date} />
    </ScrollView>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 20, paddingTop: 52, paddingBottom: 60 },

  header:      { marginBottom: 24 },
  headerSub:   { fontSize: 13, letterSpacing: 0.2, marginBottom: 4 },
  headerTitle: { fontSize: 36, letterSpacing: -1.5 },

  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    marginBottom: 28,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroNum:   { fontSize: 42, letterSpacing: -2, lineHeight: 44, textAlign: 'center' },
  heroTotal: { fontSize: 14, letterSpacing: -0.3, textAlign: 'center' },
  heroLabel: { fontSize: 14, letterSpacing: 0.1 },

  pctText: { fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
});
