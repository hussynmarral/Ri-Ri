import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors, { CATEGORY_COLOR, CATEGORY_TINT } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  computeRemainingTime,
  formatBlockTime,
  formatTimeRemaining,
} from '@/lib/scheduler/engine';
import type { ScheduleBlock } from '@/types';

interface Props {
  block: ScheduleBlock;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export function CurrentBlock({ block, onStart, onComplete, onSkip }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const accent = CATEGORY_COLOR[block.category] ?? '#7B7CF8';
  const tint   = CATEGORY_TINT[block.category]  ?? 'rgba(123,124,248,0.08)';
  const remaining  = computeRemainingTime(block);
  const isPending  = block.status === 'pending';
  const isActive   = block.status === 'in_progress';

  const label = isActive ? 'NOW' : 'UP NEXT';

  return (
    <View style={[s.card, { backgroundColor: tint, borderColor: accent + '28' }]}>
      {/* Header strip */}
      <View style={s.header}>
        <View style={[s.dot, { backgroundColor: isActive ? accent : colors.muted }]} />
        <Text style={[s.label, { color: isActive ? accent : colors.muted }]}>{label}</Text>
        {isActive && remaining > 0 && (
          <Text style={[s.remaining, { color: colors.textSecondary }]}>
            {formatTimeRemaining(remaining)} left
          </Text>
        )}
      </View>

      {/* Title */}
      <Text style={[s.title, { color: colors.text }]} numberOfLines={2}>
        {block.title}
      </Text>

      {/* Time */}
      <Text style={[s.time, { color: colors.muted }]}>
        {formatBlockTime(block.scheduledStart)} – {formatBlockTime(block.scheduledEnd)}
      </Text>

      {block.latenessMinutes > 0 && (
        <Text style={[s.late, { color: colors.warning }]}>
          {block.latenessMinutes}m behind schedule
        </Text>
      )}

      {/* Actions */}
      <View style={s.actions}>
        {isPending && (
          <PressBtn
            label="Start"
            bgColor={accent}
            textColor="#fff"
            onPress={onStart}
            flex={1}
          />
        )}
        {isActive && (
          <>
            <PressBtn
              label="Complete"
              bgColor={colors.success}
              textColor="#fff"
              onPress={onComplete}
              flex={1}
            />
            <View style={{ width: 8 }} />
            <PressBtn
              label="Skip"
              bgColor="transparent"
              textColor={colors.muted}
              borderColor={colors.borderStrong}
              onPress={onSkip}
              flex={0.45}
            />
          </>
        )}
      </View>
    </View>
  );
}

function PressBtn({
  label,
  bgColor,
  textColor,
  borderColor,
  onPress,
  flex,
}: {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  onPress: () => void;
  flex: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  const release = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={press} onPressOut={release} style={{ flex }}>
      <Animated.View
        style={[
          s.btn,
          {
            backgroundColor: bgColor,
            borderWidth: borderColor ? 1 : 0,
            borderColor: borderColor,
            transform: [{ scale }],
          },
        ]}
      >
        <Text style={[s.btnText, { color: textColor }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    flex: 1,
  },
  remaining: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 30,
    marginBottom: 8,
  },
  time: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.1,
    marginBottom: 4,
  },
  late: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 18,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
