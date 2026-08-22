import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GYM_ROTATION } from '@/constants/gym';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  todayGymDay: number; // 1-7
}

export function GymRotation({ todayGymDay }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {GYM_ROTATION.map((g) => {
        const isToday = g.day === todayGymDay;
        return (
          <View
            key={g.day}
            style={[
              s.row,
              isToday && { backgroundColor: colors.primary + '18' },
              g.day < GYM_ROTATION.length && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={[s.dayNumWrap, { backgroundColor: isToday ? colors.primary : colors.border }]}>
              <Text style={[s.dayNum, { color: isToday ? '#fff' : colors.muted }]}>{g.day}</Text>
            </View>
            <View style={s.info}>
              <Text style={[s.dayName, { color: colors.muted }]}>{DAY_NAMES[g.day - 1]}</Text>
              <Text style={[s.label, { color: isToday ? colors.text : colors.muted }]} numberOfLines={1}>
                {g.label}
              </Text>
            </View>
            <View style={[s.typeBadge, { backgroundColor: g.type === 'cardio' ? colors.success + '22' : colors.warning + '22' }]}>
              <Text style={[s.typeText, { color: g.type === 'cardio' ? colors.success : colors.warning }]}>
                {g.type === 'cardio' ? 'Cardio' : 'Weights'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  dayNumWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dayNum: { fontSize: 13, fontWeight: '700' },
  info: { flex: 1 },
  dayName: { fontSize: 11, marginBottom: 1 },
  label: { fontSize: 14, fontWeight: '500' },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontWeight: '600' },
});
