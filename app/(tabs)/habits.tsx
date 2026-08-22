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
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

export default function HabitsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
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
      {/* Today summary */}
      <View style={[s.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.summaryNum, { color: colors.primary }]}>
          {completedCount}/{HABIT_KEYS.length}
        </Text>
        <Text style={[s.summaryLabel, { color: colors.muted }]}>habits done today</Text>
      </View>

      {/* Today's habits */}
      <Text style={[s.sectionLabel, { color: colors.muted }]}>Today</Text>
      {HABIT_KEYS.map((key) => (
        <HabitRow
          key={key}
          habitKey={key}
          completed={!!todayHabits[key]?.completed}
          onToggle={() => toggle(key)}
        />
      ))}

      {/* 7-day history grid */}
      <Text style={[s.sectionLabel, { color: colors.muted, marginTop: 24 }]}>This Week</Text>
      <WeekGrid weekHabits={weekHabits} dates={weekDates} todayDate={date} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  summaryNum: { fontSize: 36, fontWeight: '800' },
  summaryLabel: { fontSize: 15 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 2,
  },
});
