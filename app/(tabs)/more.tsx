import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';

export default function MoreScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const { user, signOut } = useAuthStore();
  const { todaySession, startWorkout, completeWorkout } = useWorkoutStore();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <ScrollView
      style={[s.root, { backgroundColor: colors.background }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Account */}
      <SectionHeader label="Account" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row label="📧  Email" value={user?.email ?? ''} colors={colors} />
        <Divider colors={colors} />
        <Row label="🚪  Sign out" colors={colors} danger onPress={handleSignOut} />
      </View>

      {/* Today's workout */}
      {todaySession && (
        <>
          <SectionHeader label="Today's Workout" colors={colors} />
          <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={s.workoutHeader}>
              <Text style={s.workoutEmoji}>🏋️</Text>
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
              <View style={s.workoutBtns}>
                {!todaySession.startedAt && (
                  <TouchableOpacity
                    style={[s.workoutBtn, { backgroundColor: colors.warning }]}
                    onPress={startWorkout}
                  >
                    <Text style={s.workoutBtnText}>Start Workout</Text>
                  </TouchableOpacity>
                )}
                {todaySession.startedAt && (
                  <TouchableOpacity
                    style={[s.workoutBtn, { backgroundColor: colors.success }]}
                    onPress={completeWorkout}
                  >
                    <Text style={s.workoutBtnText}>Complete Workout</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </>
      )}

      {/* App info */}
      <SectionHeader label="App" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row label="ℹ️  Ri Ri" value="v1.0 — Personal OS" colors={colors} />
      </View>
    </ScrollView>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: typeof Colors.light }) {
  return (
    <Text style={[s.sectionLabel, { color: colors.muted }]}>{label.toUpperCase()}</Text>
  );
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
  colors: typeof Colors.light;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <Text style={[s.rowLabel, { color: danger ? colors.danger : colors.text }]}>{label}</Text>
      {value ? <Text style={[s.rowValue, { color: colors.muted }]} numberOfLines={1}>{value}</Text> : null}
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: typeof Colors.light }) {
  return <View style={[s.divider, { backgroundColor: colors.border }]} />;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 20,
    marginLeft: 4,
  },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { flex: 1, fontSize: 16 },
  rowValue: { fontSize: 14, maxWidth: '50%' },
  divider: { height: 1, marginLeft: 16 },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  workoutEmoji: { fontSize: 28 },
  workoutTitle: { fontSize: 15, fontWeight: '600' },
  workoutStatus: { fontSize: 13, marginTop: 2 },
  workoutBtns: { paddingHorizontal: 16, paddingBottom: 16 },
  workoutBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  workoutBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
