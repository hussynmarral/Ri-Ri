import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GlassCard } from '@/components/ui/GlassCard';
import { GymRotation } from '@/components/workout/GymRotation';
import { useAuthStore } from '@/stores/authStore';
import { useWorkoutStore } from '@/stores/workoutStore';
import { GYM_ROTATION } from '@/constants/gym';
import { todayDateISO } from '@/lib/scheduler/engine';
import { ScreenTransition } from '@/components/ui/ScreenTransition';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── quick-link card ───────────────────────────────────────────────────────────

function QuickLink({ glyph, label, sub, onPress, accent }: {
  glyph: string; label: string; sub: string; onPress: () => void; accent?: string;
}) {
  const colors = Colors[useColorScheme() ?? 'dark'];
  const scale  = useRef(new Animated.Value(1)).current;
  const pi = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  const po = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={pi} onPressOut={po} style={{ flex: 1 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <GlassCard radius={18} intensity={12} style={{}}>
          <View style={ql.inner}>
            <Text style={[ql.glyph, { color: accent ?? colors.primary }]}>{glyph}</Text>
            <Text style={[ql.label, { color: colors.text, fontFamily: Fonts.display }]}>{label}</Text>
            <Text style={[ql.sub,   { color: colors.muted, fontFamily: Fonts.body }]}>{sub}</Text>
          </View>
        </GlassCard>
      </Animated.View>
    </Pressable>
  );
}
const ql = StyleSheet.create({
  inner: { padding: 16, gap: 4 },
  glyph: { fontSize: 22, marginBottom: 2 },
  label: { fontSize: 15, letterSpacing: -0.3 },
  sub:   { fontSize: 11, letterSpacing: 0.1 },
});

// ── spring button ──────────────────────────────────────────────────────────────

function SpringBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pi = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const po = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={pi} onPressOut={po}>
      <Animated.View style={[wb.btn, { backgroundColor: color, transform: [{ scale }] }]}>
        <Text style={[wb.text, { fontFamily: Fonts.bodyBold }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
const wb = StyleSheet.create({
  btn:  { borderRadius: 13, paddingVertical: 13, alignItems: 'center' },
  text: { color: '#AEBBD1', fontSize: 15, letterSpacing: -0.2 },
});

// ── log set modal ──────────────────────────────────────────────────────────────

function LogSetModal({ exercise, visible, onClose, onLog, pr, colors }: {
  exercise: string;
  visible: boolean;
  onClose: () => void;
  onLog: (reps: number, weightKg: number) => void;
  pr?: { reps: number; weightKg: number } | null;
  colors: typeof Colors.dark;
}) {
  const [reps,   setReps]   = useState('');
  const [weight, setWeight] = useState('');

  function handleLog() {
    const r = parseInt(reps, 10);
    const w = parseFloat(weight);
    if (!r || !w || r <= 0 || w <= 0) {
      Alert.alert('Invalid', 'Enter valid reps and weight.');
      return;
    }
    onLog(r, w);
    setReps(''); setWeight('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[lm.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[{ width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18, backgroundColor: colors.borderStrong }]} />
        <Text style={[lm.title, { color: colors.text, fontFamily: Fonts.display }]}>Log Set</Text>
        <Text style={[lm.exName, { color: colors.primary, fontFamily: Fonts.body }]}>{exercise}</Text>
        {pr && (
          <Text style={[lm.pr, { color: colors.muted, fontFamily: Fonts.body }]}>
            PR: {pr.weightKg}kg × {pr.reps}
          </Text>
        )}
        <View style={lm.row}>
          <View style={{ flex: 1 }}>
            <Text style={[lm.fieldLabel, { color: colors.muted, fontFamily: Fonts.body }]}>REPS</Text>
            <TextInput
              style={[lm.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.elevated, fontFamily: Fonts.display }]}
              value={reps}
              onChangeText={setReps}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={colors.placeholder}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[lm.fieldLabel, { color: colors.muted, fontFamily: Fonts.body }]}>WEIGHT (kg)</Text>
            <TextInput
              style={[lm.input, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.elevated, fontFamily: Fonts.display }]}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="60"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>
        <Pressable onPress={handleLog} style={({ pressed }) => [lm.logBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
          <Text style={[lm.logTxt, { fontFamily: Fonts.bodyBold }]}>Log Set</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
const lm = StyleSheet.create({
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 36 },
  title:      { fontSize: 22, letterSpacing: -0.8, marginBottom: 4 },
  exName:     { fontSize: 15, letterSpacing: -0.1, marginBottom: 4 },
  pr:         { fontSize: 12, letterSpacing: 0.1, marginBottom: 16 },
  row:        { flexDirection: 'row', gap: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 10, letterSpacing: 0.8, marginBottom: 6 },
  input:      { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 22, letterSpacing: -1 },
  logBtn:     { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  logTxt:     { fontSize: 15, color: '#080A0E', letterSpacing: 0.1 },
});

// ── exercise row ───────────────────────────────────────────────────────────────

function ExerciseRow({ name, muscle, sets, reps, setsDone, isPR, onLog, colors }: {
  name: string; muscle: string; sets: number; reps: string;
  setsDone: number; isPR: boolean; onLog: () => void; colors: typeof Colors.dark;
}) {
  const done = setsDone >= sets;
  return (
    <View style={[er.row, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[er.name, { color: done ? colors.success : colors.text, fontFamily: Fonts.body }]}>{name}</Text>
          {isPR && <Text style={[er.prBadge, { color: colors.warning, fontFamily: Fonts.body }]}>PR</Text>}
        </View>
        <Text style={[er.meta, { color: colors.placeholder, fontFamily: Fonts.body }]}>
          {muscle} · {sets} × {reps}
          {setsDone > 0 ? ` · ${setsDone}/${sets} done` : ''}
        </Text>
      </View>
      <Pressable onPress={onLog} style={({ pressed }) => [er.logBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.5 : 1, backgroundColor: done ? colors.success + '18' : 'transparent' }]}>
        <Text style={[er.logTxt, { color: done ? colors.success : colors.primary, fontFamily: Fonts.body }]}>+ Set</Text>
      </Pressable>
    </View>
  );
}
const er = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  name:    { fontSize: 14, letterSpacing: -0.1 },
  prBadge: { fontSize: 10, letterSpacing: 0.5 },
  meta:    { fontSize: 11, marginTop: 2, letterSpacing: 0.1 },
  logBtn:  { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  logTxt:  { fontSize: 12, letterSpacing: 0.1 },
});

// ── screen ─────────────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const {
    todaySession, sessionHistory: rawHistory, todaySets: rawSets, prs: rawPrs,
    load, loadHistory, startWorkout, completeWorkout, logSet,
  } = useWorkoutStore();
  const sessionHistory = rawHistory ?? [];
  const todaySets = rawSets ?? [];
  const prs = rawPrs ?? {};

  const date = todayDateISO();
  const [logExercise, setLogExercise] = useState<string | null>(null);
  const [showExercises, setShowExercises] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    load(user.id, date);
    loadHistory(user.id);
  }, [user?.id]);

  const gymDayData = todaySession
    ? GYM_ROTATION.find((d) => d.day === todaySession.gymDay)
    : null;

  function getSetsForExercise(name: string) {
    return todaySets.filter((s) => s.exercise === name);
  }

  async function handleLog(reps: number, weightKg: number) {
    if (!logExercise) return;
    await logSet(logExercise, reps, weightKg);
  }

  return (
    <ScreenTransition>
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <Text style={[s.headerSub,   { color: colors.muted, fontFamily: Fonts.body }]}>Ri Ri</Text>
        <Text style={[s.headerTitle, { color: colors.text, fontFamily: Fonts.display }]}>More</Text>
      </View>

      {/* Quick links */}
      <View style={s.grid}>
        <QuickLink glyph="◻" label="Habits"   sub="Daily streaks"   onPress={() => router.push('/(main)/habits' as any)}   accent={colors.success} />
        <QuickLink glyph="◇" label="Markets"  sub="Live clocks"     onPress={() => router.push('/(main)/markets' as any)}  accent={colors.primary} />
      </View>
      <View style={[s.grid, { marginTop: 10 }]}>
        <QuickLink glyph="⚙" label="Settings" sub="Account & more"  onPress={() => router.push('/(main)/settings' as any)} accent={colors.muted} />
        <QuickLink glyph="≡" label="Schedule" sub="Full timeline"   onPress={() => router.push('/(main)/schedule' as any)} accent={colors.primary} />
      </View>

      {/* ── Today's Workout ── */}
      {todaySession && (
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>Today's Workout</Text>

          <View style={[s.workoutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Status row */}
            <View style={s.workoutHeader}>
              <View style={[s.workoutDot, { backgroundColor: colors.warning + '22', borderColor: colors.warning + '44' }]}>
                <View style={[s.workoutDotInner, {
                  backgroundColor: todaySession.completed ? colors.success : todaySession.startedAt ? colors.warning : colors.muted,
                }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.workoutTitle, { color: colors.text, fontFamily: Fonts.display }]}>
                  Day {todaySession.gymDay} — {todaySession.label}
                </Text>
                <Text style={[s.workoutStatus, { color: colors.muted, fontFamily: Fonts.body }]}>
                  {todaySession.completed
                    ? `Done${todaySession.durationMinutes ? ` · ${todaySession.durationMinutes}m` : ''}`
                    : todaySession.startedAt ? `Started ${fmt12(todaySession.startedAt)}`
                    : gymDayData ? `${gymDayData.durationMinutes}m · ${gymDayData.exercises.length} exercises`
                    : 'Not started'}
                </Text>
              </View>
              {/* Sets logged badge */}
              {todaySets.length > 0 && (
                <View style={[s.setsBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
                  <Text style={[s.setsBadgeTxt, { color: colors.primary, fontFamily: Fonts.display }]}>{todaySets.length}</Text>
                  <Text style={[s.setsBadgeSub, { color: colors.primary + 'AA', fontFamily: Fonts.body }]}>sets</Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            {!todaySession.completed && (
              <View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 8 }}>
                {!todaySession.startedAt ? (
                  <SpringBtn label="Start Workout" color={colors.warning} onPress={startWorkout} />
                ) : (
                  <SpringBtn label="Complete Workout" color={colors.success} onPress={completeWorkout} />
                )}
              </View>
            )}

            {/* Exercise list toggle */}
            {gymDayData && gymDayData.type === 'weights' && (
              <>
                <Pressable
                  onPress={() => setShowExercises((v) => !v)}
                  style={[s.toggleRow, { borderTopColor: colors.border }]}
                >
                  <Text style={[s.toggleLabel, { color: colors.muted, fontFamily: Fonts.body }]}>
                    Exercises ({gymDayData.exercises.length})
                  </Text>
                  <Text style={[s.toggleArrow, { color: colors.placeholder }]}>{showExercises ? '▲' : '▼'}</Text>
                </Pressable>

                {showExercises && (
                  <View style={{ paddingHorizontal: 18, paddingBottom: 10 }}>
                    {gymDayData.exercises.map((ex) => {
                      const exerciseSets = getSetsForExercise(ex.name);
                      const latestPR = prs[ex.name];
                      const lastSet  = exerciseSets[exerciseSets.length - 1];
                      const isPR     = !!(lastSet && latestPR && lastSet.weightKg != null && lastSet.weightKg >= latestPR.weightKg);
                      return (
                        <ExerciseRow
                          key={ex.name}
                          name={ex.name}
                          muscle={ex.muscle}
                          sets={ex.sets}
                          reps={ex.reps}
                          setsDone={exerciseSets.length}
                          isPR={isPR}
                          onLog={() => setLogExercise(ex.name)}
                          colors={colors}
                        />
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      )}

      {/* ── Personal Records ── */}
      {Object.keys(prs).length > 0 && (
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>Personal Records</Text>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {Object.entries(prs).slice(0, 8).map(([exercise, pr], i) => (
              <View key={exercise}>
                {i > 0 && <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 }]} />}
                <View style={s.prRow}>
                  <Text style={[s.prExercise, { color: colors.text, fontFamily: Fonts.body }]}>{exercise}</Text>
                  <Text style={[s.prValue, { color: colors.warning, fontFamily: Fonts.display }]}>
                    {pr.weightKg}kg × {pr.reps}
                  </Text>
                  <Text style={[s.prDate, { color: colors.placeholder, fontFamily: Fonts.body }]}>{fmtDate(pr.date)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── History ── */}
      {sessionHistory.length > 0 && (
        <View style={s.section}>
          <Pressable onPress={() => setShowHistory((v) => !v)} style={s.historyToggle}>
            <Text style={[s.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body, marginBottom: 0 }]}>
              History ({sessionHistory.length})
            </Text>
            <Text style={[{ color: colors.placeholder, fontSize: 12 }]}>{showHistory ? '▲' : '▼'}</Text>
          </Pressable>

          {showHistory && (
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }]}>
              {sessionHistory.map((session, i) => (
                <View key={session.id}>
                  {i > 0 && <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 }]} />}
                  <View style={s.histRow}>
                    <View>
                      <Text style={[s.histDate, { color: colors.text, fontFamily: Fonts.body }]}>{fmtDate(session.sessionDate)}</Text>
                      <Text style={[s.histLabel, { color: colors.muted, fontFamily: Fonts.body }]}>Day {session.gymDay} — {session.label}</Text>
                    </View>
                    {session.durationMinutes && (
                      <Text style={[s.histDuration, { color: colors.primary, fontFamily: Fonts.display }]}>{session.durationMinutes}m</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Gym Rotation ── */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>Gym Rotation</Text>
        <GymRotation todayGymDay={todaySession?.gymDay ?? 1} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>

    {/* Log Set Modal */}
    <LogSetModal
      exercise={logExercise ?? ''}
      visible={!!logExercise}
      onClose={() => setLogExercise(null)}
      onLog={handleLog}
      pr={logExercise ? prs[logExercise] : null}
      colors={colors}
    />
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 20, paddingTop: 52, paddingBottom: 20 },

  header:      { marginBottom: 24 },
  headerSub:   { fontSize: 13, letterSpacing: 0.2, marginBottom: 4 },
  headerTitle: { fontSize: 36, letterSpacing: -1.5 },

  grid: { flexDirection: 'row', gap: 10 },

  section:      { marginTop: 24 },
  sectionLabel: { fontSize: 12, letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: 10, fontFamily: Fonts.body },

  workoutCard:      { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  workoutHeader:    { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  workoutDot:       { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  workoutDotInner:  { width: 10, height: 10, borderRadius: 5 },
  workoutTitle:     { fontSize: 15, letterSpacing: -0.2 },
  workoutStatus:    { fontSize: 12, marginTop: 2 },
  setsBadge:        { borderRadius: 12, borderWidth: 1, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4 },
  setsBadgeTxt:     { fontSize: 22, letterSpacing: -1, lineHeight: 26 },
  setsBadgeSub:     { fontSize: 9, letterSpacing: 0.5 },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  toggleLabel:      { fontSize: 11, letterSpacing: 0.5 },
  toggleArrow:      { fontSize: 10 },

  card:     { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  prRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  prExercise: { flex: 1, fontSize: 13, letterSpacing: -0.1 },
  prValue:  { fontSize: 15, letterSpacing: -0.5 },
  prDate:   { fontSize: 11, letterSpacing: 0.1, minWidth: 60, textAlign: 'right' },

  historyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  histRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  histDate: { fontSize: 14, letterSpacing: -0.2 },
  histLabel:{ fontSize: 11, marginTop: 2, letterSpacing: 0.1 },
  histDuration: { fontSize: 20, letterSpacing: -1 },
});
