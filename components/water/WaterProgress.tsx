import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { WATER_DAILY_TARGET_ML } from '@/constants/schedule';

const QUICK_AMOUNTS = [150, 250, 500];

interface Props {
  totalMl: number;
  onAdd: (ml: number) => void;
}

export function WaterProgress({ totalMl, onAdd }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const pct = Math.min(1, totalMl / WATER_DAILY_TARGET_ML);
  const remaining = Math.max(0, WATER_DAILY_TARGET_ML - totalMl);

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.header}>
        <Text style={[s.ml, { color: colors.text }]}>{totalMl} ml</Text>
        <Text style={[s.target, { color: colors.muted }]}>of {WATER_DAILY_TARGET_ML} ml</Text>
      </View>

      <View style={[s.barBg, { backgroundColor: colors.border }]}>
        <View style={[s.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: '#38BDF8' }]} />
      </View>

      <Text style={[s.remaining, { color: colors.muted }]}>
        {remaining > 0 ? `${remaining} ml to go` : 'Daily goal reached!'}
      </Text>

      <View style={s.quickRow}>
        {QUICK_AMOUNTS.map((ml) => (
          <TouchableOpacity
            key={ml}
            style={[s.quickBtn, { backgroundColor: colors.background, borderColor: '#38BDF8' }]}
            onPress={() => onAdd(ml)}
          >
            <Text style={[s.quickText, { color: '#38BDF8' }]}>+{ml}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 },
  ml: { fontSize: 36, fontWeight: '800' },
  target: { fontSize: 15, marginLeft: 8 },
  barBg: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: 12, borderRadius: 6 },
  remaining: { fontSize: 13, marginBottom: 16 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  quickText: { fontSize: 15, fontWeight: '700' },
});
