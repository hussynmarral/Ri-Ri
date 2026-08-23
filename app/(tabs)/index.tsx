import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { BlockCard } from '@/components/schedule/BlockCard';
import { CurrentBlock } from '@/components/schedule/CurrentBlock';
import { AICommandBar } from '@/components/ai/AICommandBar';
import { AIActionSheet } from '@/components/ai/AIActionSheet';
import { computeDailySummary, todayDateISO } from '@/lib/scheduler/engine';
import { saveDailyStats } from '@/lib/stats/saveDailyStats';
import { processSyncQueue } from '@/lib/sync/syncEngine';
import { getIsOnline } from '@/lib/sync/networkState';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWaterStore } from '@/stores/waterStore';
import { useHabitStore } from '@/stores/habitStore';
import { useAIStore } from '@/stores/aiStore';
import type { AIContext } from '@/lib/ai/client';

function formatDateDisplay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const rest    = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return { weekday, rest };
}

export default function TodayScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const user   = useAuthStore((s) => s.user);

  const {
    todayBlocks, currentBlock, nextBlock, isLoading,
    load, startBlock, completeBlock, skipBlock, refreshCurrent,
  } = useScheduleStore();

  const { todayTotalMl } = useWaterStore();
  const { todayHabits }  = useHabitStore();

  const {
    isLoading: aiLoading, pendingActions, actionValidations, aiResponse, error: aiError,
    sendCommand, confirmActions, dismissActions,
  } = useAIStore();

  const [refreshing, setRefreshing] = useState(false);
  const date = todayDateISO();
  const { weekday, rest } = formatDateDisplay(date);

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id]);

  useEffect(() => {
    const id = setInterval(refreshCurrent, 60_000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      if (getIsOnline()) await processSyncQueue().catch(() => {});
      await Promise.all([
        load(user.id, date),
        useWaterStore.getState().load(user.id, date),
        useHabitStore.getState().load(user.id, date),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, date]);

  const summary    = computeDailySummary(todayBlocks);
  const shownBlock = currentBlock ?? nextBlock;
  const listBlocks = todayBlocks.filter((b) => b.id !== shownBlock?.id);
  const showAISheet = pendingActions.length > 0 || (!!aiResponse && !aiLoading);

  async function handleComplete(id: string) {
    await completeBlock(id);
    const block = todayBlocks.find((b) => b.id === id);
    if (block?.category === 'review' && user) {
      saveDailyStats(user.id, date).catch(() => {});
    }
  }

  function buildAIContext(): AIContext {
    const completedHabits = Object.entries(todayHabits)
      .filter(([, log]) => log?.completed)
      .map(([key]) => key);
    return {
      date,
      blocks: todayBlocks.map((b) => ({
        id: b.id, title: b.title, category: b.category,
        scheduledStart: b.scheduledStart, scheduledEnd: b.scheduledEnd, status: b.status,
      })),
      waterMl: todayTotalMl,
      habitsCompleted: completedHabits,
    };
  }

  function header() {
    return (
      <View style={s.headerWrap}>
        {/* Date + score */}
        <View style={s.dateRow}>
          <View style={s.dateBlock}>
            <Text style={[s.weekday, { color: colors.text }]}>{weekday}</Text>
            <Text style={[s.dateRest, { color: colors.muted }]}>{rest}</Text>
          </View>
          {todayBlocks.length > 0 && (
            <View style={[s.scorePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.scoreNum, { color: colors.primary }]}>{summary.disciplineScore}</Text>
              <Text style={[s.scoreLbl, { color: colors.muted }]}>score</Text>
            </View>
          )}
        </View>

        {/* Stats row — only when there's data */}
        {todayBlocks.length > 0 && (
          <View style={[s.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <StatPill label="Done" value={`${summary.totalCompleted}/${summary.totalScheduled}`} color={colors.success} />
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <StatPill label="Skipped" value={String(summary.totalSkipped)} color={colors.danger} />
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <StatPill label="Avg late" value={summary.avgLatenessMinutes > 0 ? `${summary.avgLatenessMinutes}m` : '—'} color={colors.warning} />
          </View>
        )}

        {/* Current / next block */}
        {shownBlock && (
          <CurrentBlock
            block={shownBlock}
            onStart={() => startBlock(shownBlock.id)}
            onComplete={() => handleComplete(shownBlock.id)}
            onSkip={() => skipBlock(shownBlock.id)}
          />
        )}

        {listBlocks.length > 0 && (
          <Text style={[s.sectionLabel, { color: colors.placeholder }]}>Schedule</Text>
        )}
      </View>
    );
  }

  if (isLoading && todayBlocks.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isLoading && todayBlocks.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.emptyTitle, { color: colors.text }]}>No schedule yet</Text>
        <Text style={[s.emptyBody, { color: colors.muted }]}>
          Pull down to refresh or ask the AI to build your day.
        </Text>
        <Pressable onPress={() => user && load(user.id, date)} style={({ pressed }) => [s.retryBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[s.retryText, { color: colors.textSecondary }]}>Refresh</Text>
        </Pressable>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <AICommandBar onSend={(msg) => user && sendCommand(msg, buildAIContext(), user.id)} isLoading={aiLoading} />

      <AIActionSheet
        visible={showAISheet}
        aiResponse={aiError ?? aiResponse}
        actions={pendingActions}
        actionValidations={actionValidations}
        isLoading={aiLoading}
        onConfirm={() => { if (!user) return; confirmActions(user.id, () => load(user.id, date)); }}
        onDismiss={dismissActions}
      />
    </View>
  );
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color: '#52525B' }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  list:    { padding: 20, paddingBottom: 16 },

  headerWrap:  { marginBottom: 6 },
  dateRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  dateBlock:   {},
  weekday:     { fontSize: 28, fontWeight: '700', letterSpacing: -0.8, lineHeight: 32 },
  dateRest:    { fontSize: 15, fontWeight: '400', letterSpacing: 0, marginTop: 2 },

  scorePill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scoreNum: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  scoreLbl: { fontSize: 10, fontWeight: '500', letterSpacing: 0.4, marginTop: 1 },

  statsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stat:       { flex: 1, alignItems: 'center' },
  statValue:  { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  statLabel:  { fontSize: 11, fontWeight: '400', marginTop: 2, letterSpacing: 0.2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  emptyTitle: { fontSize: 20, fontWeight: '600', letterSpacing: -0.4, marginBottom: 8 },
  emptyBody:  { fontSize: 15, fontWeight: '400', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  retryBtn:   { borderWidth: 1, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11 },
  retryText:  { fontSize: 15, fontWeight: '500' },
});
