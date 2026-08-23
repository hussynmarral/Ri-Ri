import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { RenderItemParams } from 'react-native-draggable-flatlist';

const IS_WEB = Platform.OS === 'web';

import Colors, { Fonts, CATEGORY_COLOR } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GlassCard } from '@/components/ui/GlassCard';
import { AddTaskSheet } from '@/components/ui/AddTaskSheet';
import { computeDailySummary, todayDateISO } from '@/lib/scheduler/engine';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import type { ScheduleBlock } from '@/types';
import { ScreenTransition } from '@/components/ui/ScreenTransition';

function isDarkAccent(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function blockTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function useTimeRemaining(targetIso: string, active: boolean) {
  const [secs, setSecs] = useState(() =>
    active ? Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000)) : 0,
  );
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() =>
      setSecs(Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000))),
    1000);
    return () => clearInterval(id);
  }, [targetIso, active]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m left`;
  return `${m}m left`;
}

// ── BlockRow ───────────────────────────────────────────────────────────────────

function BlockRow({
  block,
  isCurrent,
  index,
  onDone,
  onSkip,
}: {
  block: ScheduleBlock;
  isCurrent: boolean;
  index: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const accent = CATEGORY_COLOR[block.category] ?? colors.primary;
  const timeLeft = useTimeRemaining(block.scheduledEnd, isCurrent);

  // Overdue = time passed but not marked done/skipped
  const isOverdue =
    new Date(block.scheduledEnd).getTime() < Date.now() &&
    block.status !== 'completed' &&
    block.status !== 'skipped';

  // Show Skip during active block; show Done only after time expires
  const showSkip = (isCurrent || isOverdue) && block.status !== 'completed' && block.status !== 'skipped';
  const showDone = isOverdue && block.status !== 'completed' && block.status !== 'skipped';
  const showActions = showSkip;

  const isPast = block.status === 'completed' || block.status === 'skipped';
  const isSkip = block.status === 'skipped';

  // Staggered entrance
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    const delay = Math.min(index, 22) * 38;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  // Pulsing left bar for active block
  const barPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isCurrent) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(barPulse, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(barPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isCurrent]);

  // All rows get a dark-gray card surface; current gets ice-blue tint + glow
  const rowBg = isCurrent
    ? 'rgba(24,26,34,0.96)'
    : isPast
      ? 'rgba(20,20,22,0.80)'
      : 'rgba(24,24,26,0.88)';

  const rowBorderColor = isCurrent
    ? 'rgba(174,187,209,0.40)'
    : isPast
      ? 'rgba(255,255,255,0.09)'
      : 'rgba(255,255,255,0.15)';

  return (
    <Animated.View
      style={[
        br.wrap,
        {
          opacity: isPast
            ? opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.72] })
            : opacity,
          transform: [{ translateY }],
        },
        isCurrent && {
          shadowColor: '#91A4C7',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.24,
          shadowRadius: 16,
          elevation: 8,
        },
      ]}
    >
      {/* Pulsing ambient halo for active block */}
      {isCurrent && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -4, left: -4, right: -4, bottom: -4,
            borderRadius: 18,
            backgroundColor: accent,
            opacity: barPulse.interpolate({ inputRange: [0.4, 1], outputRange: [0.05, 0.18] }),
          }}
        />
      )}
      <View
        style={[
          br.inner,
          {
            backgroundColor: rowBg,
            borderColor: rowBorderColor,
          },
        ]}
      >
        {/* Glass top-edge highlight */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 1, right: 1, height: 1,
            backgroundColor: isCurrent ? 'rgba(174,187,209,0.30)' : 'rgba(255,255,255,0.15)',
            zIndex: 10,
          }}
        />
        {/* Left accent bar */}
        <Animated.View
          style={[
            br.bar,
            {
              backgroundColor: accent,
              opacity: isCurrent ? barPulse : isPast ? 0.3 : 0.7,
            },
          ]}
        />

        <View style={br.body}>
          <View style={br.topRow}>
            <Text
              style={[
                br.title,
                {
                  color: isCurrent ? colors.text : isPast ? colors.muted : colors.textSecondary,
                  fontFamily: isCurrent ? Fonts.display : Fonts.body,
                  fontSize: isCurrent ? 17 : 15,
                  textDecorationLine: isSkip ? 'line-through' : 'none',
                },
              ]}
              numberOfLines={1}
            >
              {block.title}
            </Text>

            {/* Status badge */}
            {(block.status === 'completed' || block.status === 'skipped') && (
              <View
                style={[
                  br.badge,
                  {
                    backgroundColor: block.status === 'completed'
                      ? 'rgba(145,164,199,0.18)'
                      : 'rgba(255,255,255,0.07)',
                  },
                ]}
              >
                <Text
                  style={[
                    br.badgeTxt,
                    { color: block.status === 'completed' ? '#AEBBD1' : '#8993A3' },
                  ]}
                >
                  {block.status === 'completed' ? 'Done' : 'Skipped'}
                </Text>
              </View>
            )}
          </View>

          <Text style={[br.time, { color: colors.placeholder }]}>
            {blockTime(block.scheduledStart)} → {blockTime(block.scheduledEnd)}
          </Text>

          {isCurrent && !isOverdue && (
            <Text style={[br.remaining, { color: accent, fontFamily: Fonts.mono }]}>
              {timeLeft}
            </Text>
          )}

          {showActions && (
            <View style={br.actionRow}>
              {isOverdue && (
                <View style={[br.overdueTag, { backgroundColor: 'rgba(89,107,137,0.30)' }]}>
                  <Text style={[br.overdueText, { color: '#D9DDE5', fontFamily: Fonts.body }]}>Overdue</Text>
                </View>
              )}
              <View style={br.actionBtns}>
                <Pressable
                  onPress={onSkip}
                  style={({ pressed }) => [br.actionBtn, { borderColor: colors.borderStrong, borderWidth: 1, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[br.actionBtnTxt, { color: colors.textSecondary, fontFamily: Fonts.body }]}>Skip</Text>
                </Pressable>
                {showDone && (
                  <Pressable
                    onPress={onDone}
                    style={({ pressed }) => [br.actionBtn, { backgroundColor: accent, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <Text style={[br.actionBtnTxt, { color: isDarkAccent(accent) ? '#E8F0F8' : '#0D1528', fontFamily: Fonts.bodyBold }]}>Done</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const br = StyleSheet.create({
  wrap:   { marginBottom: 8 },
  inner:  {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bar:    { width: 4, minHeight: 52 },
  body:   { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title:  { flex: 1, letterSpacing: -0.2 },
  badge:  { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  time:   { fontSize: 12, letterSpacing: 0 },
  remaining: { fontSize: 13, letterSpacing: 0.2, marginTop: 1 },

  actionRow:    { marginTop: 8, gap: 6 },
  overdueTag:   { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  overdueText:  { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  actionBtns:   { flexDirection: 'row', gap: 8 },
  actionBtn:    { flex: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  actionBtnTxt: { fontSize: 13, letterSpacing: -0.1 },
});

// ── Summary cells ──────────────────────────────────────────────────────────────

function SummaryCell({ label, value, color, compact = false }: { label: string; value: string; color: string; compact?: boolean }) {
  const colors = Colors[useColorScheme() ?? 'dark'];
  return (
    <View style={[sc.cell, compact && { paddingVertical: 12 }]}>
      <Text style={[sc.val, { color, fontFamily: Fonts.display, fontSize: compact ? 22 : 28 }]}>{value}</Text>
      <Text style={[sc.lbl, { color: colors.placeholder, fontFamily: Fonts.body }]}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  val:  { letterSpacing: -1.5 },
  lbl:  { fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const user   = useAuthStore((s) => s.user);
  const { todayBlocks, currentBlock, load, completeBlock, skipBlock, refreshCurrent } = useScheduleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const date = todayDateISO();

  const d = new Date(`${date}T12:00:00`);
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Stable key: re-sort only when blocks change identity or status
  const blocksKey = useMemo(
    () => todayBlocks.map((b) => b.id + b.status).join(','),
    [todayBlocks],
  );
  const [sortedBlocks, setSortedBlocks] = useState<ScheduleBlock[]>(() =>
    [...todayBlocks].sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
  );
  useEffect(() => {
    setSortedBlocks([...todayBlocks].sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)));
  }, [blocksKey]);

  // Header fade
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide   = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id, date]);

  // Keep currentBlock in sync as time passes (blocks naturally enter/exit their window)
  useEffect(() => {
    const id = setInterval(refreshCurrent, 30_000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await load(user.id, date).catch(() => {});
    setRefreshing(false);
  }, [user?.id, date]);

  const summary = computeDailySummary(todayBlocks);

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<ScheduleBlock>) => (
    <ScaleDecorator activeScale={0.97}>
      <Pressable onLongPress={drag} delayLongPress={180} disabled={isActive}>
        <BlockRow
          block={item}
          isCurrent={item.id === currentBlock?.id}
          index={getIndex() ?? 0}
          onDone={() => completeBlock(item.id)}
          onSkip={() => skipBlock(item.id)}
        />
      </Pressable>
    </ScaleDecorator>
  ), [currentBlock?.id, completeBlock, skipBlock]);

  const ListHeader = useMemo(() => (
    <>
      {/* Header */}
      <Animated.View
        style={[s.header, { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }]}
      >
        <Text style={[s.headerDate, { color: colors.muted, fontFamily: Fonts.body }]}>{dateLabel}</Text>
        <View style={s.headerRow}>
          <Text style={[s.headerTitle, { color: colors.text, fontFamily: Fonts.display, fontSize: isMobile ? 28 : 36 }]}>Schedule</Text>
          <Text style={[s.dragHint, { color: colors.placeholder, fontFamily: Fonts.body }]}>Hold to reorder</Text>
        </View>
      </Animated.View>

      {/* Summary card */}
      <Animated.View style={{ opacity: headerOpacity }}>
        <GlassCard style={s.summaryCard} radius={20}>
          <View style={s.summaryRow}>
            <SummaryCell label="Total"   value={String(summary.totalScheduled)} color={colors.textSecondary} compact={isMobile} />
            <SummaryCell label="Done"    value={String(summary.totalCompleted)} color={colors.success} compact={isMobile} />
            <SummaryCell label="Left"    value={String(todayBlocks.filter((b) => b.status === 'pending' || b.status === 'in_progress').length)} color={colors.primary} compact={isMobile} />
            <SummaryCell label="Score"   value={String(summary.disciplineScore)} color={colors.primary} compact={isMobile} />
          </View>
        </GlassCard>
      </Animated.View>
    </>
  ), [colors, dateLabel, isMobile, summary, todayBlocks]);

  const contentStyle = [s.content, isMobile && { padding: 14, paddingTop: 36 }];

  return (
    <ScreenTransition>
    <View style={{ flex: 1 }}>
      {IS_WEB ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {ListHeader}
          {sortedBlocks.map((item, index) => (
            <BlockRow
              key={item.id}
              block={item}
              isCurrent={item.id === currentBlock?.id}
              index={index}
              onDone={() => completeBlock(item.id)}
              onSkip={() => skipBlock(item.id)}
            />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : (
        <DraggableFlatList
          data={sortedBlocks}
          onDragEnd={({ data }) => setSortedBlocks(data)}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ flex: 1 }}
          activationDistance={20}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={ListHeader}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* FAB — add ad-hoc task */}
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => [
          s.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={s.fabPlus}>
          <View style={[s.fabH, { backgroundColor: '#080A0E' }]} />
          <View style={[s.fabV, { backgroundColor: '#080A0E' }]} />
        </View>
      </Pressable>

      <AddTaskSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        userId={user?.id ?? ''}
        date={date}
      />
    </View>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 20, paddingTop: 52, paddingBottom: 40 },

  header:      { marginBottom: 24 },
  headerDate:  { fontSize: 13, letterSpacing: 0.2, marginBottom: 4 },
  headerRow:   { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  headerTitle: { fontSize: 36, letterSpacing: -1.5 },
  dragHint:    { fontSize: 11, letterSpacing: 0.3, opacity: 0.6 },

  summaryCard: { marginBottom: 24 },
  summaryRow:  { flexDirection: 'row' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPlus: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  fabH: { position: 'absolute', width: 16, height: 2, borderRadius: 1 },
  fabV: { position: 'absolute', width: 2, height: 16, borderRadius: 1 },
});
