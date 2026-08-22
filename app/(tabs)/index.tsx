import { useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { BlockCard } from '@/components/schedule/BlockCard';
import { CurrentBlock } from '@/components/schedule/CurrentBlock';
import { computeDailySummary, todayDateISO } from '@/lib/scheduler/engine';
import { saveDailyStats } from '@/lib/stats/saveDailyStats';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/scheduleStore';

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const user = useAuthStore((s) => s.user);
  const { todayBlocks, currentBlock, nextBlock, isLoading, load, startBlock, completeBlock, skipBlock, refreshCurrent } =
    useScheduleStore();

  const date = todayDateISO();

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id]);

  useEffect(() => {
    const id = setInterval(refreshCurrent, 60_000);
    return () => clearInterval(id);
  }, []);

  const summary = computeDailySummary(todayBlocks);

  // Auto-save daily stats when the review block is completed
  async function handleComplete(id: string) {
    await completeBlock(id);
    const block = todayBlocks.find((b) => b.id === id);
    if (block?.category === 'review' && user) {
      saveDailyStats(user.id, date).catch(() => {});
    }
  }

  const shownBlock = currentBlock ?? nextBlock;

  const listBlocks = todayBlocks.filter((b) => b.id !== shownBlock?.id);

  function header() {
    return (
      <View style={s.headerWrap}>
        <View style={s.dateRow}>
          <View>
            <Text style={[s.dateLabel, { color: colors.muted }]}>Today</Text>
            <Text style={[s.dateText, { color: colors.text }]}>{formatDate(date)}</Text>
          </View>
          <View style={[s.scoreBadge, { backgroundColor: colors.primary }]}>
            <Text style={s.scoreNum}>{summary.disciplineScore}</Text>
            <Text style={s.scoreLbl}>score</Text>
          </View>
        </View>

        {todayBlocks.length > 0 && (
          <View style={[s.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Stat label="Done" value={`${summary.totalCompleted}/${summary.totalScheduled}`} color={colors.success} />
            <Stat label="Skipped" value={String(summary.totalSkipped)} color={colors.danger} />
            <Stat label="Avg late" value={summary.avgLatenessMinutes > 0 ? `${summary.avgLatenessMinutes}m` : 'On time'} color={colors.warning} />
          </View>
        )}

        {shownBlock && (
          <CurrentBlock
            block={shownBlock}
            onStart={() => startBlock(shownBlock.id)}
            onComplete={() => handleComplete(shownBlock.id)}
            onSkip={() => skipBlock(shownBlock.id)}
          />
        )}

        {listBlocks.length > 0 && (
          <Text style={[s.sectionLabel, { color: colors.muted }]}>Schedule</Text>
        )}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (todayBlocks.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.empty, { color: colors.muted }]}>No schedule for today</Text>
        <TouchableOpacity onPress={() => user && load(user.id, date)}>
          <Text style={{ color: colors.primary, marginTop: 8 }}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={listBlocks}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BlockCard block={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color: '#9CA3AF' }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  headerWrap: { marginBottom: 4 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dateLabel: { fontSize: 13, marginBottom: 2 },
  dateText: { fontSize: 20, fontWeight: '700' },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  scoreNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  scoreLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: -2 },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  empty: { fontSize: 16 },
});
