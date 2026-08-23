import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { HABIT_KEYS } from '@/stores/habitStore';
import { HABIT_COLOR } from '@/constants/Colors';
import type { HabitKey } from '@/stores/habitStore';

const HABIT_INITIALS: Record<HabitKey, string> = {
  reading:     'Rd',
  english:     'En',
  turkish:     'Tr',
  skincare:    'Sk',
  haircare:    'Hr',
  supplements: 'Sp',
};

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  weekHabits: Record<string, Partial<Record<HabitKey, boolean>>>;
  dates: string[];
  todayDate: string;
}

export function WeekGrid({ weekHabits, dates, todayDate }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Day header */}
      <View style={[s.row, s.headerRow, { borderBottomColor: colors.border }]}>
        <View style={s.labelCell} />
        {dates.map((d) => {
          const isToday = d === todayDate;
          const dow = new Date(`${d}T12:00:00`).getDay();
          const label = DAY_SHORT[dow === 0 ? 6 : dow - 1];
          return (
            <View key={d} style={s.dayCell}>
              <Text style={[s.dayLabel, { color: isToday ? colors.primary : colors.placeholder }]}>
                {label}
              </Text>
              {isToday && <View style={[s.todayLine, { backgroundColor: colors.primary }]} />}
            </View>
          );
        })}
      </View>

      {/* Habit rows */}
      {HABIT_KEYS.map((key, ki) => {
        const accent = HABIT_COLOR[key] ?? colors.primary;
        return (
          <View
            key={key}
            style={[
              s.row,
              ki < HABIT_KEYS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            <View style={s.labelCell}>
              <Text style={[s.habitLabel, { color: colors.muted }]}>{HABIT_INITIALS[key]}</Text>
            </View>
            {dates.map((d) => {
              const done    = weekHabits[d]?.[key] === true;
              const isToday = d === todayDate;
              return (
                <View key={d} style={s.dayCell}>
                  <View
                    style={[
                      s.dot,
                      done
                        ? { backgroundColor: accent }
                        : isToday
                        ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.borderStrong }
                        : { backgroundColor: colors.elevated },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },

  headerRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },

  labelCell: { width: 48, paddingLeft: 14 },
  dayCell:   { flex: 1, alignItems: 'center' },

  dayLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, textTransform: 'uppercase' },
  todayLine: { width: 12, height: 2, borderRadius: 1, marginTop: 2 },

  habitLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.1 },
  dot:        { width: 16, height: 16, borderRadius: 8 },
});
