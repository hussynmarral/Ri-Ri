import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { HabitKey } from '@/stores/habitStore';

const HABIT_LABEL: Record<HabitKey, string> = {
  reading: 'Reading',
  english: 'English',
  turkish: 'Turkish',
  skincare: 'Skincare',
  haircare: 'Hair Care',
  supplements: 'Supplements',
};

const HABIT_EMOJI: Record<HabitKey, string> = {
  reading: '📖',
  english: '🇬🇧',
  turkish: '🇹🇷',
  skincare: '✨',
  haircare: '💈',
  supplements: '💊',
};

interface Props {
  habitKey: HabitKey;
  completed: boolean;
  onToggle: () => void;
}

export function HabitRow({ habitKey, completed, onToggle }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[
        s.row,
        {
          backgroundColor: colors.card,
          borderColor: completed ? colors.success : colors.border,
        },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[s.emoji, { backgroundColor: colors.background }]}>
        <Text style={s.emojiText}>{HABIT_EMOJI[habitKey]}</Text>
      </View>
      <Text style={[s.label, { color: colors.text }]}>{HABIT_LABEL[habitKey]}</Text>
      <View
        style={[
          s.check,
          {
            backgroundColor: completed ? colors.success : 'transparent',
            borderColor: completed ? colors.success : colors.border,
          },
        ]}
      >
        {completed && <Text style={s.checkMark}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  emoji: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  emojiText: { fontSize: 18 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
