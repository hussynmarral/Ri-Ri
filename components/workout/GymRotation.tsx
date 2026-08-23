import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GYM_ROTATION } from '@/constants/gym';

interface Props {
  todayGymDay: number; // 1-7
}

export function GymRotation({ todayGymDay }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {GYM_ROTATION.map((g, idx) => {
        const isToday   = g.day === todayGymDay;
        const isCardio  = g.type === 'cardio';
        const badgeColor = isCardio ? colors.success : colors.warning;
        const badgeBg    = isCardio ? colors.successTint : colors.warningTint;

        return (
          <View
            key={g.day}
            style={[
              s.row,
              isToday && { backgroundColor: colors.primary + '10' },
              idx < GYM_ROTATION.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            {/* Day number pill */}
            <View
              style={[
                s.dayPill,
                isToday
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: 'transparent', borderColor: colors.borderStrong },
              ]}
            >
              <Text style={[s.dayPillText, { color: isToday ? '#AEBBD1' : colors.muted }]}>
                {g.day}
              </Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: isToday ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                {g.label}
              </Text>
            </View>

            {/* Type badge */}
            <View style={[s.typeBadge, { backgroundColor: badgeBg }]}>
              <Text style={[s.typeText, { color: badgeColor }]}>
                {isCardio ? 'Cardio' : 'Weights'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },

  dayPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: { fontSize: 13, fontWeight: '700' },

  label:    { fontSize: 14, fontWeight: '500', letterSpacing: -0.1 },
  typeBadge: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4 },
  typeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },
});
