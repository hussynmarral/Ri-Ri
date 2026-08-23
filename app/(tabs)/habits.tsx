import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { HabitRow } from '@/components/habits/HabitRow';
import { WeekGrid } from '@/components/habits/WeekGrid';
import { todayDateISO } from '@/lib/scheduler/engine';
import { useAuthStore } from '@/stores/authStore';
import { HABIT_KEYS, useHabitStore } from '@/stores/habitStore';
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
  const { todayHabits, weekHabits, load, loadWeek, markComplete, markIncomplete } = useHabitStore();

  const date = todayDateISO();
  const weekDates = useMemo(() => last7Dates(date), [date]);

  useEffect(() => {
    if (!user) return;
    load(user.id, date);
    loadWeek(user.id, weekDates);
  }, [user?.id]);

  const completedCount = HABIT_KEYS.filter((k) => todayHabits[k]?.completed).length;
  const total = HABIT_KEYS.length;

  function toggle(key: HabitKey) {
    if (!user) return;
    const log = todayHabits[key];
    if (log?.completed) {
      markIncomplete(user.id, key, date);
    } else {
      markComplete(user.id, key, date);
    }
  }

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.background }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Score hero */}
      <View style={[s.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.heroLeft}>
          <Text style={[s.heroNum, { color: colors.primary }]}>{completedCount}</Text>
          <Text style={[s.heroSlash, { color: colors.placeholder }]}>/{total}</Text>
        </View>
        <View style={s.heroRight}>
          <Text style={[s.heroLabel, { color: colors.muted }]}>habits done today</Text>
          <View style={[s.progressTrack, { backgroundColor: colors.elevated }]}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${Math.round((completedCount / total) * 100)}%`,
                  backgroundColor: completedCount === total ? colors.success : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Today's habits */}
      <Text style={[s.sectionLabel, { color: colors.placeholder }]}>Today</Text>
      {HABIT_KEYS.map((key) => (
        <HabitRow
          key={key}
          habitKey={key}
          completed={!!todayHabits[key]?.completed}
          onToggle={() => toggle(key)}
        />
      ))}

      {/* 7-day history */}
      <Text style={[s.sectionLabel, { color: colors.placeholder, marginTop: 28 }]}>This Week</Text>
      <WeekGrid weekHabits={weekHabits} dates={weekDates} todayDate={date} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    marginBottom: 24,
    gap: 20,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroNum: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -2,
  },
  heroSlash: {
    fontSize: 24,
    fontWeight: '400',
    marginLeft: 2,
    letterSpacing: -0.5,
  },
  heroRight: { flex: 1 },
  heroLabel: { fontSize: 13, fontWeight: '400', marginBottom: 10 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
});
