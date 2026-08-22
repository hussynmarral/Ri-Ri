import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl,
  StyleSheet, Text, TouchableOpacity, View,
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

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

export default function TodayScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const user = useAuthStore((s) => s.user);

  const {
    todayBlocks, currentBlock, nextBlock, isLoading,
    load, startBlock, completeBlock, skipBlock, refreshCurrent,
  } = useScheduleStore();

  const { todayTotalMl } = useWaterStore();
  const { todayHabits } = useHabitStore();

  const {
    isLoading: aiLoading, pendingActions, aiResponse, error: aiError,
    sendCommand, confirmActions, dismissActions,
  } = useAIStore();

  const [refreshing, setRefreshing] = useState(false);
  const date = todayDateISO();

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

  const summary = computeDailySummary(todayBlocks);

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
        id: b.id,
        title: b.title,
        category: b.category,
        scheduledStart: b.scheduledStart,
        scheduledEnd: b.scheduledEnd,
        status: b.status,
      })),
      waterMl: todayTotalMl,
      habitsCompleted: completedHabits,
    };
  }

  function handleAISend(message: string) {
    if (!user) return;
    sendCommand(message, buildAIContext(), user.id);
  }

  const shownBlock = currentBlock ?? nextBlock;
  const listBlocks = todayBlocks.filter((b) => b.id !== shownBlock?.id);
  const showAISheet = pendingActions.length > 0 || (!!aiResponse && !aiLoading);

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
            <Stat
              label="Avg late"
              value={summary.avgLatenessMinutes > 0 ? `${summary.avgLatenessMinutes}m` : 'On time'}
              color={colors.warning}
            />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <AICommandBar onSend={handleAISend} isLoading={aiLoading} />

      <AIActionSheet
        visible={showAISheet}
        aiResponse={aiError ?? aiResponse}
        actions={pendingActions}
        isLoading={aiLoading}
        onConfirm={() => {
          if (!user) return;
          confirmActions(user.id, () => load(user.id, date));
        }}
        onDismiss={dismissActions}
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
  list: { padding: 16, paddingBottom: 8 },
  headerWrap: { marginBottom: 4 },
  dateRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  dateLabel: { fontSize: 13, marginBottom: 2 },
  dateText: { fontSize: 20, fontWeight: '700' },
  scoreBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  scoreNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  scoreLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: -2 },
  statsRow: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    marginBottom: 16, padding: 14, justifyContent: 'space-around',
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 10,
  },
  empty: { fontSize: 16 },
});
