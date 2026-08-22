import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
  const [custom, setCustom] = useState('');

  function submitCustom() {
    const ml = parseInt(custom, 10);
    if (!ml || ml <= 0 || ml > 5000) {
      Alert.alert('Invalid amount', 'Enter between 1 and 5000 ml');
      return;
    }
    onAdd(ml);
    setCustom('');
  }

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.header}>
        <Text style={[s.ml, { color: colors.text }]}>{totalMl}</Text>
        <Text style={[s.unit, { color: colors.muted }]}> ml</Text>
        <Text style={[s.target, { color: colors.muted }]}>  / {WATER_DAILY_TARGET_ML} ml</Text>
      </View>

      <View style={[s.barBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            s.barFill,
            { width: `${Math.round(pct * 100)}%`, backgroundColor: pct >= 1 ? colors.success : '#38BDF8' },
          ]}
        />
      </View>

      <Text style={[s.remaining, { color: colors.muted }]}>
        {remaining > 0 ? `${remaining} ml to go` : 'Daily goal reached! ✓'}
      </Text>

      {/* Quick add */}
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

      {/* Custom amount */}
      <View style={s.customRow}>
        <TextInput
          style={[s.customInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          placeholder="Custom ml"
          placeholderTextColor={colors.muted}
          keyboardType="numeric"
          value={custom}
          onChangeText={setCustom}
          returnKeyType="done"
          onSubmitEditing={submitCustom}
          maxLength={4}
        />
        <TouchableOpacity
          style={[s.customBtn, { backgroundColor: '#38BDF8', opacity: custom ? 1 : 0.4 }]}
          onPress={submitCustom}
          disabled={!custom}
        >
          <Text style={s.customBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 14 },
  ml: { fontSize: 40, fontWeight: '800' },
  unit: { fontSize: 18 },
  target: { fontSize: 14 },
  barBg: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: 12, borderRadius: 6 },
  remaining: { fontSize: 13, marginBottom: 16 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  quickText: { fontSize: 15, fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 10 },
  customInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 16,
  },
  customBtn: { borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  customBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
