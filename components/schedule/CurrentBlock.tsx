import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  computeRemainingTime,
  formatBlockTime,
  formatTimeRemaining,
} from '@/lib/scheduler/engine';
import type { BlockCategory, ScheduleBlock } from '@/types';

const CATEGORY_COLOR: Record<BlockCategory, string> = {
  shopify: '#6366F1',
  agency: '#8B5CF6',
  office: '#3B82F6',
  gym: '#F59E0B',
  language: '#10B981',
  shower: '#64748B',
  skincare: '#EC4899',
  meal: '#F97316',
  reading: '#14B8A6',
  content: '#DB2777',
  review: '#0EA5E9',
  sleep: '#7C3AED',
  water: '#38BDF8',
  supplements: '#84CC16',
  flex: '#94A3B8',
  movement: '#FB923C',
  weekend_run: '#EF4444',
  weekly_reset: '#06B6D4',
  other: '#6B7280',
};

interface Props {
  block: ScheduleBlock;
  onStart: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

export function CurrentBlock({ block, onStart, onComplete, onSkip }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const accent = CATEGORY_COLOR[block.category] ?? '#6366F1';
  const remaining = computeRemainingTime(block);
  const isPending = block.status === 'pending';
  const isActive = block.status === 'in_progress';

  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: accent }]}>
      <View style={[s.topBar, { backgroundColor: accent }]}>
        <Text style={s.topLabel}>{isActive ? 'Now' : 'Up next'}</Text>
        {isActive && remaining > 0 && (
          <Text style={s.remaining}>{formatTimeRemaining(remaining)} left</Text>
        )}
      </View>

      <View style={s.body}>
        <Text style={[s.title, { color: colors.text }]} numberOfLines={2}>
          {block.title}
        </Text>
        <Text style={[s.time, { color: colors.muted }]}>
          {formatBlockTime(block.scheduledStart)} – {formatBlockTime(block.scheduledEnd)}
        </Text>
        {block.latenessMinutes > 0 && (
          <Text style={[s.late, { color: colors.warning }]}>
            Started {block.latenessMinutes}m late
          </Text>
        )}

        <View style={s.actions}>
          {isPending && (
            <TouchableOpacity style={[s.btn, { backgroundColor: accent }]} onPress={onStart}>
              <Text style={s.btnText}>Start</Text>
            </TouchableOpacity>
          )}
          {isActive && (
            <>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.success, flex: 1 }]}
                onPress={onComplete}
              >
                <Text style={s.btnText}>Complete</Text>
              </TouchableOpacity>
              <View style={{ width: 10 }} />
              <TouchableOpacity
                style={[s.btn, s.btnOutline, { borderColor: colors.border, flex: 0.5 }]}
                onPress={onSkip}
              >
                <Text style={[s.btnText, { color: colors.muted }]}>Skip</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 2, overflow: 'hidden', marginBottom: 16 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topLabel: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  remaining: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  body: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  time: { fontSize: 14, marginBottom: 4 },
  late: { fontSize: 13, marginBottom: 4 },
  actions: { flexDirection: 'row', marginTop: 16 },
  btn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  btnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
