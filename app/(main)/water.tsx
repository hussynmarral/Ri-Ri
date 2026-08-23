import { useEffect, useRef } from 'react';
import { Animated, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { WaterProgress } from '@/components/water/WaterProgress';
import { todayDateISO } from '@/lib/scheduler/engine';
import { useAuthStore } from '@/stores/authStore';
import { useWaterStore } from '@/stores/waterStore';
import { ScreenTransition } from '@/components/ui/ScreenTransition';

const WATER_COLOR = '#91A4C7';

function SparkDot({ delay, offsetX }: { delay: number; offsetX: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1,   duration: 180, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 1,   duration: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0,   duration: 380, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 0.4, duration: 380, useNativeDriver: true }),
      ]),
      Animated.delay(700),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: 'absolute',
      top: -10,
      width: 3, height: 3, borderRadius: 1.5,
      backgroundColor: WATER_COLOR,
      opacity,
      transform: [{ scale }, { translateX: offsetX }],
    }} />
  );
}

function AnimatedWeekBar({ pct, isToday, index }: { pct: number; isToday: boolean; index: number }) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const delay = index * 55;
    Animated.spring(heightAnim, { toValue: Math.max(4, pct * 100), tension: 60, friction: 14, delay, useNativeDriver: false }).start();
  }, [pct]);
  const height = heightAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <Animated.View style={{ width: '100%', borderRadius: 4, height, backgroundColor: isToday ? WATER_COLOR : WATER_COLOR + '55' }} />
  );
}

function formatLogTime(isoString: string) {
  const d = new Date(isoString);
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

// ── Log row ────────────────────────────────────────────────────────────────────

function LogRow({
  amountMl,
  loggedAt,
  onDelete,
  index,
}: {
  amountMl: number;
  loggedAt: string;
  onDelete: () => void;
  index: number;
}) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    const delay = Math.min(index, 10) * 40;
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 280, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        s.logRow,
        { borderBottomColor: colors.border, opacity, transform: [{ translateX }] },
      ]}
    >
      {/* Dot */}
      <View style={[s.dot, { backgroundColor: WATER_COLOR + '60' }]} />

      {/* Time */}
      <Text style={[s.logTime, { color: colors.placeholder, fontFamily: Fonts.body }]}>
        {formatLogTime(loggedAt)}
      </Text>

      {/* Amount */}
      <View style={s.logAmtRow}>
        <Text style={[s.logAmt, { color: WATER_COLOR, fontFamily: Fonts.display }]}>
          +{amountMl}
        </Text>
        <Text style={[s.logUnit, { color: WATER_COLOR + '88', fontFamily: Fonts.body }]}>ml</Text>
      </View>

      {/* Delete */}
      <Pressable
        onPress={onDelete}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        style={({ pressed }) => ({ opacity: pressed ? 0.4 : 0.7 })}
      >
        <View style={[s.delBtn, { borderColor: colors.borderStrong }]}>
          <View style={[s.delX,  { backgroundColor: colors.muted }]} />
          <View style={[s.delX, s.delX2, { backgroundColor: colors.muted }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function WaterScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const user   = useAuthStore((s) => s.user);
  const { todayLogs, todayTotalMl, streak, weekHistory, load, addLog, deleteLog } = useWaterStore();
  const date = todayDateISO();

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id, date]);

  const reversedLogs = [...todayLogs].reverse();
  const WATER_GOAL   = 3000;
  const maxWeek      = Math.max(...(weekHistory ?? []).map((w) => w.totalMl), WATER_GOAL);

  function header() {
    return (
      <View>
        <View style={s.header}>
          <View>
            <Text style={[s.headerSub, { color: colors.muted, fontFamily: Fonts.body }]}>Today</Text>
            <Text style={[s.headerTitle, { color: colors.text, fontFamily: Fonts.display }]}>Water</Text>
          </View>
          {streak > 0 && (
            <View style={[s.streakBadge, { backgroundColor: WATER_COLOR + '18', borderColor: WATER_COLOR + '44' }]}>
              <Text style={[s.streakTxt, { color: WATER_COLOR, fontFamily: Fonts.display }]}>{streak}</Text>
              <Text style={[s.streakLabel, { color: WATER_COLOR + 'AA', fontFamily: Fonts.body }]}>day streak</Text>
            </View>
          )}
        </View>

        <WaterProgress totalMl={todayTotalMl} onAdd={(ml) => user && addLog(user.id, ml)} />

        {/* Week history */}
        {(weekHistory ?? []).length > 0 && (
          <View style={[s.weekCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.weekLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>This Week</Text>
            <View style={s.weekBars}>
              {(weekHistory ?? []).map((day, i) => {
                const pct    = maxWeek > 0 ? Math.min(1, day.totalMl / maxWeek) : 0;
                const isToday = day.date === date;
                return (
                  <View key={day.date} style={[s.weekBarCol, { position: 'relative' }]}>
                    <View style={[s.weekBarTrack, { backgroundColor: colors.elevated }]}>
                      <AnimatedWeekBar pct={pct} isToday={isToday} index={i} />
                    </View>
                    {isToday && (
                      <>
                        <SparkDot delay={0}   offsetX={-5} />
                        <SparkDot delay={320} offsetX={1}  />
                        <SparkDot delay={640} offsetX={6}  />
                      </>
                    )}
                    <Text style={[s.weekBarDate, { color: isToday ? WATER_COLOR : colors.placeholder, fontFamily: Fonts.body }]}>
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'narrow' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {reversedLogs.length > 0 && (
          <View style={s.logHeader}>
            <Text style={[s.logLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>Log</Text>
            <Text style={[s.logCount, { color: colors.placeholder, fontFamily: Fonts.body }]}>
              {reversedLogs.length} entries
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScreenTransition>
    <View style={s.root}>
      <FlatList
        data={reversedLogs}
        keyExtractor={(l) => l.id}
        renderItem={({ item, index }) => (
          <LogRow
            amountMl={item.amountMl}
            loggedAt={item.loggedAt}
            onDelete={() => deleteLog(item.id)}
            index={index}
          />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={null}
      />
    </View>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 20, paddingTop: 52, paddingBottom: 60 },

  header:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 },
  headerSub:    { fontSize: 13, letterSpacing: 0.2, marginBottom: 4 },
  headerTitle:  { fontSize: 36, letterSpacing: -1.5 },

  streakBadge:  { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', marginBottom: 4 },
  streakTxt:    { fontSize: 24, letterSpacing: -1, lineHeight: 28 },
  streakLabel:  { fontSize: 10, letterSpacing: 0.5 },

  weekCard:     { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 20 },
  weekLabel:    { fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  weekBars:     { flexDirection: 'row', gap: 6, height: 60 },
  weekBarCol:   { flex: 1, alignItems: 'center', gap: 4 },
  weekBarTrack: { flex: 1, width: '100%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  weekBarFill:  { width: '100%', borderRadius: 4 },
  weekBarDate:  { fontSize: 10, letterSpacing: 0.2 },

  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 8,
  },
  logLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  logCount: {
    fontSize: 11,
    letterSpacing: 0.2,
  },

  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  logTime: {
    flex: 1,
    fontSize: 13,
    letterSpacing: 0.1,
  },
  logAmtRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  logAmt:  { fontSize: 20, letterSpacing: -0.8 },
  logUnit: { fontSize: 12 },

  delBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delX:  { position: 'absolute', width: 9, height: 1.5, borderRadius: 1, transform: [{ rotate: '45deg'  }] },
  delX2: { transform: [{ rotate: '-45deg' }] },
});
