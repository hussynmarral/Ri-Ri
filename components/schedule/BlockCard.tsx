import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { formatBlockTime } from '@/lib/scheduler/engine';
import type { BlockCategory, CompletionStatus, ScheduleBlock } from '@/types';

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

const STATUS_LABEL: Record<CompletionStatus, string> = {
  pending: '',
  in_progress: 'Active',
  completed: 'Done',
  skipped: 'Skipped',
  partial: 'Partial',
};

interface Props {
  block: ScheduleBlock;
  onPress?: () => void;
}

export function BlockCard({ block, onPress }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const accent = CATEGORY_COLOR[block.category] ?? '#6B7280';

  const isActive = block.status === 'in_progress';
  const isDone = block.status === 'completed' || block.status === 'partial';
  const isSkipped = block.status === 'skipped';
  const statusLabel = STATUS_LABEL[block.status];

  return (
    <TouchableOpacity
      style={[
        s.card,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? accent : colors.border,
          borderLeftColor: accent,
          opacity: isSkipped ? 0.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.accent, { backgroundColor: accent }]} />

      <View style={s.body}>
        <View style={s.row}>
          <Text
            style={[
              s.title,
              { color: colors.text },
              isDone && { textDecorationLine: 'line-through', color: colors.muted },
            ]}
            numberOfLines={1}
          >
            {block.title}
          </Text>
          {statusLabel ? (
            <View style={[s.badge, { backgroundColor: isActive ? accent : colors.border }]}>
              <Text style={[s.badgeText, { color: isActive ? '#fff' : colors.muted }]}>
                {statusLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[s.time, { color: colors.muted }]}>
          {formatBlockTime(block.scheduledStart)} – {formatBlockTime(block.scheduledEnd)}
          {block.latenessMinutes > 0 ? `  +${block.latenessMinutes}m late` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accent: { width: 0 },
  body: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  time: { fontSize: 12, marginTop: 3 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
