import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { HabitRow } from '@/components/habits/HabitRow';
import { todayDateISO } from '@/lib/scheduler/engine';
import { useAuthStore } from '@/stores/authStore';
import { HABIT_KEYS, useHabitStore } from '@/stores/habitStore';
import type { HabitKey } from '@/stores/habitStore';

export default function HabitsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const user = useAuthStore((s) => s.user);
  const { todayHabits, load, markComplete, markIncomplete } = useHabitStore();

  const date = todayDateISO();

  useEffect(() => {
    if (user) load(user.id, date);
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
      <View style={[s.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.summaryNum, { color: colors.primary }]}>{completedCount}/{HABIT_KEYS.length}</Text>
        <Text style={[s.summaryLabel, { color: colors.muted }]}>habits done today</Text>
      </View>

      {HABIT_KEYS.map((key) => (
        <HabitRow
          key={key}
          habitKey={key}
          completed={!!todayHabits[key]?.completed}
          onToggle={() => toggle(key)}
        />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
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
});
