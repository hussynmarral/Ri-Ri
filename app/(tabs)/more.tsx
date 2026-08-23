import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRef } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GymRotation } from '@/components/workout/GymRotation';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';

export default function MoreScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { user, signOut } = useAuthStore();
  const { todaySession, startWorkout, completeWorkout } = useWorkoutStore();

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.background }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Account */}
      <SectionLabel label="Account" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row label="Email" value={user?.email ?? '—'} colors={colors} />
        <RowDivider colors={colors} />
        <Row label="Sign out" colors={colors} danger onPress={signOut} />
      </View>

      {/* Today's workout */}
      {todaySession && (
        <>
          <SectionLabel label="Today's Workout" colors={colors} />
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.workoutHeader}>
              <View style={[s.workoutDot, { backgroundColor: colors.warning + '22', borderColor: colors.warning + '44' }]}>
                <View style={[s.workoutDotInner, { backgroundColor: colors.warning }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.workoutTitle, { color: colors.text }]}>
                  Day {todaySession.gymDay} — {todaySession.label}
                </Text>
                <Text style={[s.workoutStatus, { color: colors.muted }]}>
                  {todaySession.completed
                    ? `Completed${todaySession.durationMinutes ? ` · ${todaySession.durationMinutes}m` : ''}`
                    : todaySession.startedAt
                    ? 'In progress'
                    : 'Not started'}
                </Text>
              </View>
            </View>

            {!todaySession.completed && (
              <View style={s.workoutBtnWrap}>
                {!todaySession.startedAt && (
                  <SpringBtn label="Start" color={colors.warning} onPress={startWorkout} />
                )}
                {todaySession.startedAt && (
                  <SpringBtn label="Complete" color={colors.success} onPress={completeWorkout} />
                )}
              </View>
            )}
          </View>
        </>
      )}

      {/* Gym rotation */}
      <SectionLabel label="Gym Rotation" colors={colors} />
      <GymRotation todayGymDay={todaySession?.gymDay ?? 1} />

      {/* App info */}
      <SectionLabel label="App" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row label="Ri Ri" value="v1.0 — Personal OS" colors={colors} />
      </View>
    </ScrollView>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: (typeof Colors)['dark'] }) {
  return (
    <Text style={[s.sectionLabel, { color: colors.placeholder }]}>{label.toUpperCase()}</Text>
  );
}

function RowDivider({ colors }: { colors: (typeof Colors)['dark'] }) {
  return <View style={[s.divider, { backgroundColor: colors.border }]} />;
}

function Row({
  label,
  value,
  colors,
  danger,
  onPress,
}: {
  label: string;
  value?: string;
  colors: (typeof Colors)['dark'];
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.row, { opacity: pressed && onPress ? 0.6 : 1 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[s.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      {value ? (
        <Text style={[s.rowValue, { color: colors.muted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SpringBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[s.workoutBtn, { backgroundColor: color, transform: [{ scale }] }]}>
        <Text style={s.workoutBtnText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 28,
  },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '400', letterSpacing: 0 },
  rowValue: { fontSize: 13, maxWidth: '55%', textAlign: 'right' },
  divider:  { height: StyleSheet.hairlineWidth, marginLeft: 18 },

  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  workoutDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  workoutTitle:  { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  workoutStatus: { fontSize: 12, fontWeight: '400', marginTop: 2, letterSpacing: 0.1 },

  workoutBtnWrap: { paddingHorizontal: 18, paddingBottom: 18 },
  workoutBtn: {
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
  },
  workoutBtnText: {
    color: '#09090B',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
  },
});
