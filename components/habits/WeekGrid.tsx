import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { HABIT_KEYS } from '@/stores/habitStore';
import type { HabitKey } from '@/stores/habitStore';

const HABIT_LABEL: Record<HabitKey, string> = {
  reading: 'Read',
  english: 'EN',
  turkish: 'TR',
  skincare: 'Skin',
  haircare: 'Hair',
  supplements: 'Supps',
};

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  // weekHabits[date][habitKey] = completed
  weekHabits: Record<string, Partial<Record<HabitKey, boolean>>>;
  dates: string[]; // 7 YYYY-MM-DD strings, oldest first
  todayDate: string;
}

export function WeekGrid({ weekHabits, dates, todayDate }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Day header row */}
      <View style={s.row}>
        <View style={s.labelCell} />
        {dates.map((d, i) => {
          const isToday = d === todayDate;
          const dow = new Date(`${d}T12:00:00`).getDay();
          const label = DAY_SHORT[dow === 0 ? 6 : dow - 1];
          return (
            <View key={d} style={s.dayCell}>
              <Text
                style={[
                  s.dayLabel,
                  { color: isToday ? colors.primary : colors.muted },
                  isToday && s.todayLabel,
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Habit rows */}
      {HABIT_KEYS.map((key, ki) => (
        <View key={key} style={[s.row, ki % 2 === 0 ? { backgroundColor: colors.background + '60' } : {}]}>
          <View style={s.labelCell}>
            <Text style={[s.habitLabel, { color: colors.muted }]}>{HABIT_LABEL[key]}</Text>
          </View>
          {dates.map((d) => {
            const done = weekHabits[d]?.[key] === true;
            const isToday = d === todayDate;
            return (
              <View key={d} style={s.dayCell}>
                <View
                  style={[
                    s.dot,
                    done
                      ? { backgroundColor: colors.success }
                      : isToday
                      ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border }
                      : { backgroundColor: colors.border },
                  ]}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  labelCell: { width: 52, paddingLeft: 12 },
  dayCell: { flex: 1, alignItems: 'center' },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  todayLabel: { fontWeight: '800' },
  habitLabel: { fontSize: 11, fontWeight: '500' },
  dot: { width: 18, height: 18, borderRadius: 9 },
});
