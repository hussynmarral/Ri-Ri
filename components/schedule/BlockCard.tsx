import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors, { CATEGORY_COLOR, CATEGORY_TINT } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatBlockTime } from '@/lib/scheduler/engine';
import type { CompletionStatus, ScheduleBlock } from '@/types';

const STATUS_LABEL: Partial<Record<CompletionStatus, string>> = {
  in_progress: 'Active',
  completed:   'Done',
  skipped:     'Skipped',
  partial:     'Partial',
};

interface Props {
  block: ScheduleBlock;
  onPress?: () => void;
}

export function BlockCard({ block, onPress }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const accent = CATEGORY_COLOR[block.category] ?? '#6B7280';
  const tint   = CATEGORY_TINT[block.category]  ?? 'rgba(107,114,128,0.06)';

  const isActive  = block.status === 'in_progress';
  const isDone    = block.status === 'completed' || block.status === 'partial';
  const isSkipped = block.status === 'skipped';
  const label     = STATUS_LABEL[block.status];

  const scale = useRef(new Animated.Value(1)).current;
  const press = () => Animated.spring(scale, { toValue: 0.975, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const release = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={press} onPressOut={release}>
      <Animated.View
        style={[
          s.card,
          {
            backgroundColor: isActive ? tint : colors.surface,
            borderColor: isActive ? accent + '30' : colors.border,
            opacity: isSkipped ? 0.38 : 1,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[s.accentBar, { backgroundColor: isDone ? colors.placeholder : accent, opacity: isDone ? 0.3 : 1 }]} />

        <View style={s.body}>
          <View style={s.row}>
            <Text
              style={[
                s.title,
                { color: isDone ? colors.muted : colors.text },
                isDone && { textDecorationLine: 'line-through' },
              ]}
              numberOfLines={1}
            >
              {block.title}
            </Text>

            {label ? (
              <View style={[
                s.badge,
                isActive
                  ? { backgroundColor: accent + '20', borderColor: accent + '40' }
                  : { backgroundColor: colors.elevated, borderColor: colors.border },
              ]}>
                <Text style={[s.badgeText, { color: isActive ? accent : colors.muted }]}>
                  {label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[s.time, { color: colors.muted }]}>
            {formatBlockTime(block.scheduledStart)}
            <Text style={{ color: colors.placeholder }}> — </Text>
            {formatBlockTime(block.scheduledEnd)}
            {block.latenessMinutes > 0 && (
              <Text style={{ color: colors.warning }}>  +{block.latenessMinutes}m</Text>
            )}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    overflow: 'hidden',
  },
  accentBar: {
    width: 2,
    borderRadius: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
