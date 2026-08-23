import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAIPrefsStore } from '@/stores/aiPrefsStore';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db/client';
import { scheduleInstances, waterLogs, habitLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { WORLD_CITIES } from '@/lib/worldCities';
import { requestNotificationPermissions } from '@/lib/notifications';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Moscow',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Riyadh',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Honolulu',
];

// ── shared sub-components ──────────────────────────────────────────────────────

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = Colors[useColorScheme() ?? 'dark'];
  return (
    <View style={ss.section}>
      <Text style={[ss.sectionTitle, { color: colors.placeholder, fontFamily: Fonts.body }]}>
        {title.toUpperCase()}
      </Text>
      <View style={[ss.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}
const ss = StyleSheet.create({
  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  card:         { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
});

function SettingRow({
  label, value, onPress, danger, toggle, toggleValue, onToggle, note,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  note?: string;
}) {
  const colors = Colors[useColorScheme() ?? 'dark'];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sr.row, { opacity: pressed && onPress ? 0.6 : 1 }]}
      disabled={!onPress && !toggle}
    >
      <View style={{ flex: 1 }}>
        <Text style={[sr.label, { color: danger ? colors.danger : colors.text, fontFamily: Fonts.body }]}>
          {label}
        </Text>
        {!!note && (
          <Text style={[sr.note, { color: colors.placeholder, fontFamily: Fonts.body }]}>{note}</Text>
        )}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.elevated, true: colors.primary }}
          thumbColor="#FAFAFA"
        />
      ) : value ? (
        <Text style={[sr.value, { color: onPress ? colors.primary : colors.muted, fontFamily: Fonts.body }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  );
}

function RowDivider() {
  const colors = Colors[useColorScheme() ?? 'dark'];
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 18 }} />;
}

const sr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  label: { fontSize: 15, letterSpacing: -0.1 },
  note:  { fontSize: 11, marginTop: 2, letterSpacing: 0.1 },
  value: { fontSize: 14, maxWidth: '50%', textAlign: 'right' },
});

// ── edit bottom sheet ──────────────────────────────────────────────────────────

function EditSheet({
  visible, onClose, title, colors, children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  colors: typeof Colors.dark;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={onClose}>
      <Pressable style={es.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
        <View style={[es.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[es.handle, { backgroundColor: colors.borderStrong }]} />
          <Text style={[es.title, { color: colors.text, fontFamily: Fonts.display }]}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const es = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:    { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 48 },
  handle:   { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:    { fontSize: 22, letterSpacing: -0.8, marginBottom: 20 },
});

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt12(h: number, m: number) {
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function SaveButton({ onPress, label = 'Save', colors }: { onPress: () => void; label?: string; colors: typeof Colors.dark }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sb.btn, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}
    >
      <Text style={[sb.txt, { fontFamily: Fonts.body }]}>{label}</Text>
    </Pressable>
  );
}
const sb = StyleSheet.create({
  btn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  txt: { color: '#080A0E', fontSize: 15, fontWeight: '600', letterSpacing: 0.1 },
});

// ── main screen ───────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { settings, load: loadSettings, update: updateSettings } = useSettingsStore();
  const { prefs: aiPrefs, load: loadAIPrefs, loaded: aiLoaded } = useAIPrefsStore();

  useEffect(() => {
    if (user) loadSettings(user.id);
    if (!aiLoaded) loadAIPrefs();
  }, [user?.id]);

  // ── theme ─────────────────────────────────────────────────────────────────
  const theme = settings?.theme ?? 'dark';
  function cycleTheme() {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    updateSettings({ theme: next });
  }

  // ── notification toggles (persisted in AsyncStorage) ──────────────────────
  const [blockNotifs, setBlockNotifs] = useState(true);
  const [waterNotifs, setWaterNotifs] = useState(true);

  useEffect(() => {
    async function loadNotifPrefs() {
      const block = await AsyncStorage.getItem('@ri_ri_block_notifs');
      const water = await AsyncStorage.getItem('@ri_ri_water_notifs');
      if (block !== null) setBlockNotifs(block === 'true');
      if (water !== null) setWaterNotifs(water === 'true');
    }
    loadNotifPrefs();
  }, []);

  async function handleBlockNotifsToggle(value: boolean) {
    setBlockNotifs(value);
    await AsyncStorage.setItem('@ri_ri_block_notifs', String(value));
    if (value) await requestNotificationPermissions();
  }

  async function handleWaterNotifsToggle(value: boolean) {
    setWaterNotifs(value);
    await AsyncStorage.setItem('@ri_ri_water_notifs', String(value));
    if (value) await requestNotificationPermissions();
  }

  // ── username ──────────────────────────────────────────────────────────────
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone]       = useState('');
  const [tzOpen,   setTzOpen]         = useState(false);
  const [tzSearch, setTzSearch]       = useState('');
  const [tzSaving, setTzSaving]       = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('display_name, timezone').eq('id', user.id).single();
      if (data?.display_name) setDisplayName(data.display_name);
      if (data?.timezone) setTimezone(data.timezone);
    }
    fetchProfile();
  }, [user?.id]);

  async function handleTzSave(tz: string) {
    if (!user) return;
    setTzSaving(true);
    await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id);
    setTimezone(tz);
    setTzSaving(false);
    setTzOpen(false);
    setTzSearch('');
  }

  const filteredTz = tzSearch.trim()
    ? COMMON_TIMEZONES.filter((t) => t.toLowerCase().includes(tzSearch.toLowerCase()))
    : COMMON_TIMEZONES;

  async function handleUsernameSave() {
    setUsernameError('');
    const trimmed = usernameInput.trim();
    if (!trimmed) { setUsernameError('Username cannot be empty.'); return; }
    if (trimmed.length < 2) { setUsernameError('Must be at least 2 characters.'); return; }
    if (!user) return;
    setUsernameLoading(true);
    const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('id', user.id);
    setUsernameLoading(false);
    if (error) { setUsernameError(error.message); }
    else { setDisplayName(trimmed); setUsernameOpen(false); }
  }

  // ── change password ───────────────────────────────────────────────────────
  const [pwdOpen, setPwdOpen]       = useState(false);
  const [newPwd, setNewPwd]         = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError]     = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  async function handleChangePassword() {
    setPwdError('');
    if (newPwd.length < 6) { setPwdError('Password must be at least 6 characters.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return; }
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdLoading(false);
    if (error) { setPwdError(error.message); }
    else { setPwdSuccess(true); setTimeout(() => { setPwdOpen(false); setPwdSuccess(false); setNewPwd(''); setConfirmPwd(''); }, 1200); }
  }

  // ── water target ──────────────────────────────────────────────────────────
  const [waterOpen, setWaterOpen]   = useState(false);
  const [waterInput, setWaterInput] = useState('');

  const [waterError, setWaterError] = useState('');
  async function handleWaterSave() {
    const ml = Math.round(parseFloat(waterInput) * 1000);
    if (isNaN(ml) || ml < 500 || ml > 10000) {
      setWaterError('Enter a value between 0.5 and 10 L.');
      return;
    }
    await updateSettings({ waterTargetMl: ml });
    setWaterError('');
    setWaterOpen(false);
  }

  // ── wake time ────────────────────────────────────────────────────────────
  const [wakeOpen, setWakeOpen] = useState(false);
  const [wakeH, setWakeH]       = useState(settings?.wakeHour ?? 12);
  const [wakeM, setWakeM]       = useState(settings?.wakeMinute ?? 0);

  function openWakePicker() {
    setWakeH(settings?.wakeHour ?? 12);
    setWakeM(settings?.wakeMinute ?? 0);
    setWakeOpen(true);
  }

  async function handleWakeSave() {
    await updateSettings({ wakeHour: wakeH, wakeMinute: wakeM });
    setWakeOpen(false);
  }

  // ── sleep time ────────────────────────────────────────────────────────────
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepH, setSleepH]       = useState(settings?.sleepHour ?? 5);
  const [sleepM, setSleepM]       = useState(settings?.sleepMinute ?? 0);

  function openSleepPicker() {
    setSleepH(settings?.sleepHour ?? 5);
    setSleepM(settings?.sleepMinute ?? 0);
    setSleepOpen(true);
  }

  async function handleSleepSave() {
    await updateSettings({ sleepHour: sleepH, sleepMinute: sleepM });
    setSleepOpen(false);
  }

  // ── export data ──────────────────────────────────────────────────────────
  async function handleExportData() {
    if (!user) return;
    try {
      // Schedule blocks
      const blocks = await db.select().from(scheduleInstances).where(eq(scheduleInstances.userId, user.id));
      const scheduleCSV = [
        'date,title,category,start,end,status,completion_percent',
        ...blocks.map((b) =>
          [b.instanceDate, `"${b.title.replace(/"/g, '""')}"`, b.category, b.scheduledStart, b.scheduledEnd, b.status, b.completionPercent].join(',')
        ),
      ].join('\n');

      // Water logs
      const wLogs = await db.select().from(waterLogs).where(eq(waterLogs.userId, user.id));
      const waterCSV = [
        'logged_at,amount_ml',
        ...wLogs.map((w) => [w.loggedAt, w.amountMl].join(',')),
      ].join('\n');

      // Habit logs
      const hLogs = await db.select().from(habitLogs).where(eq(habitLogs.userId, user.id));
      const habitCSV = [
        'date,habit_key,completed,value',
        ...hLogs.map((h) => [h.logDate, h.habitKey, h.completed ? '1' : '0', h.valueNumeric ?? ''].join(',')),
      ].join('\n');

      const combined = `=== Schedule ===\n${scheduleCSV}\n\n=== Water ===\n${waterCSV}\n\n=== Habits ===\n${habitCSV}`;
      await Share.share({ message: combined, title: 'Ri Ri Data Export' });
    } catch {
      Alert.alert('Export failed', 'Could not generate export. Try again.');
    }
  }

  // ── delete account ────────────────────────────────────────────────────────
  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will sign you out of this device. To permanently delete your account and all data, contact support at arslanj0@gmail.com.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: signOut },
      ],
    );
  }

  // ── computed display ──────────────────────────────────────────────────────
  const waterL   = settings ? `${(settings.waterTargetMl / 1000).toFixed(1)} L` : '3.0 L';
  const wakeStr  = settings ? fmt12(settings.wakeHour, settings.wakeMinute)  : '12:00 PM';
  const sleepStr = settings ? fmt12(settings.sleepHour, settings.sleepMinute) : '5:00 AM';

  const enabledIds    = settings?.enabledMarkets ?? ['nyc', 'chi', 'lax', 'lon', 'ist'];
  const enabledCities = WORLD_CITIES.filter((c) => c.alwaysOn || enabledIds.includes(c.id));

  const aiProviderLabel = aiPrefs.provider === 'gemini' ? 'Gemini' : 'Groq';
  const aiModelLabel    = aiPrefs.provider === 'gemini' ? aiPrefs.geminiModel : aiPrefs.groqModel;
  const aiToneLabel     = aiPrefs.tone.charAt(0).toUpperCase() + aiPrefs.tone.slice(1);
  const aiKeySet        = aiPrefs.provider === 'gemini' ? !!aiPrefs.geminiKey : !!aiPrefs.groqKey;

  return (
    <ScreenTransition>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Text style={[s.headerSub, { color: colors.muted, fontFamily: Fonts.body }]}>Ri Ri</Text>
          <Text style={[s.headerTitle, { color: colors.text, fontFamily: Fonts.display }]}>Settings</Text>
        </View>

        {/* Account */}
        <SettingSection title="Account">
          <SettingRow label="Email" value={user?.email ?? '—'} />
          <RowDivider />
          <SettingRow label="Username" value={displayName || 'Not set'} onPress={() => { setUsernameInput(displayName); setUsernameError(''); setUsernameOpen(true); }} />
          <RowDivider />
          <SettingRow label="Change Password" value="Update →" onPress={() => { setNewPwd(''); setConfirmPwd(''); setPwdError(''); setPwdSuccess(false); setPwdOpen(true); }} />
          <RowDivider />
          <SettingRow label="Sign Out" danger onPress={signOut} />
        </SettingSection>

        {/* Appearance */}
        <SettingSection title="Appearance">
          <SettingRow
            label="Theme"
            value={theme.charAt(0).toUpperCase() + theme.slice(1)}
            onPress={cycleTheme}
          />
          <RowDivider />
          <SettingRow label="Font" value="Marcellus · Libre Baskerville" />
        </SettingSection>

        {/* AI */}
        <SettingSection title="AI Assistant">
          <SettingRow label="Provider" value={aiProviderLabel} onPress={() => router.push('/(main)/ai' as any)} />
          <RowDivider />
          <SettingRow label="Model" value={aiModelLabel} onPress={() => router.push('/(main)/ai' as any)} />
          <RowDivider />
          <SettingRow label="Tone" value={aiToneLabel} onPress={() => router.push('/(main)/ai' as any)} />
          <RowDivider />
          <SettingRow
            label="API Key"
            value={aiKeySet ? 'Saved locally' : 'Not set'}
            note={aiKeySet ? undefined : 'Tap to configure in AI screen'}
            onPress={() => router.push('/(main)/ai' as any)}
          />
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications">
          <SettingRow label="Block reminders"  toggle toggleValue={blockNotifs} onToggle={handleBlockNotifsToggle} />
          <RowDivider />
          <SettingRow label="Water reminders"  toggle toggleValue={waterNotifs} onToggle={handleWaterNotifsToggle} />
        </SettingSection>

        {/* Water */}
        <SettingSection title="Water">
          <SettingRow label="Daily target" value={waterL} onPress={() => { setWaterInput((settings?.waterTargetMl ?? 3000) / 1000 + ''); setWaterOpen(true); }} />
          <RowDivider />
          <SettingRow label="Reminder interval" value={`Every ${settings?.waterFollowupIntervalMinutes ?? 30} min`} />
        </SettingSection>

        {/* Routine */}
        <SettingSection title="Routine">
          <SettingRow label="Wake time"    value={wakeStr}  onPress={openWakePicker} />
          <RowDivider />
          <SettingRow label="Sleep target" value={sleepStr} onPress={openSleepPicker} />
          <RowDivider />
          <SettingRow label="Office hours" value="5:00 PM – 10:00 PM" />
          <RowDivider />
          <SettingRow label="Gym time"     value="10:15 PM – 11:45 PM (weekdays)" />
        </SettingSection>

        {/* Markets */}
        <SettingSection title="Markets">
          {enabledCities.map((city, i) => (
            <View key={city.id}>
              {i > 0 && <RowDivider />}
              <SettingRow
                label={city.city}
                value={city.alwaysOn ? 'Home' : city.timezone.split('/').pop()?.replace('_', ' ')}
              />
            </View>
          ))}
          <RowDivider />
          <SettingRow label="Manage cities →" onPress={() => router.push('/(main)/markets' as any)} />
        </SettingSection>

        {/* Timezone */}
        <SettingSection title="Timezone">
          <SettingRow
            label="Home timezone"
            value={timezone || 'Loading…'}
            onPress={() => { setTzSearch(''); setTzOpen(true); }}
          />
          <RowDivider />
          <SettingRow label="Routine day boundary" value="Noon to 5 AM" />
        </SettingSection>

        {/* Privacy */}
        <SettingSection title="Privacy & Security">
          <SettingRow label="Row-level security" value="Enabled" />
          <RowDivider />
          <SettingRow label="Data encrypted at rest" value="Supabase" />
        </SettingSection>

        {/* Data Management */}
        <SettingSection title="Data">
          <SettingRow label="Export data" value="CSV →" onPress={handleExportData} note="Exports schedule, habits, and water logs" />
          <RowDivider />
          <SettingRow label="Delete account & data" danger onPress={handleDeleteAccount} note="Permanently deletes all your data" />
        </SettingSection>

        {/* App info */}
        <SettingSection title="App">
          <SettingRow label="Version"    value="v1.0.0 — Ri Ri Personal OS" />
          <RowDivider />
          <SettingRow label="Built with" value="Expo · Supabase · Gemini" />
        </SettingSection>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Change Password Sheet ─────────────────────────────────────────── */}
      <EditSheet visible={pwdOpen} onClose={() => setPwdOpen(false)} title="Change Password" colors={colors}>
        <TextInput
          style={[inp.field, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.elevated, fontFamily: Fonts.body }]}
          placeholder="New password"
          placeholderTextColor={colors.placeholder}
          value={newPwd}
          onChangeText={setNewPwd}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[inp.field, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.elevated, fontFamily: Fonts.body, marginTop: 10 }]}
          placeholder="Confirm new password"
          placeholderTextColor={colors.placeholder}
          value={confirmPwd}
          onChangeText={setConfirmPwd}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!pwdError && <Text style={[inp.err, { color: colors.danger, fontFamily: Fonts.body }]}>{pwdError}</Text>}
        {pwdSuccess && <Text style={[inp.err, { color: colors.primary, fontFamily: Fonts.body }]}>Password updated!</Text>}
        <SaveButton onPress={handleChangePassword} label={pwdLoading ? 'Saving…' : 'Update Password'} colors={colors} />
      </EditSheet>

      {/* ── Username Sheet ───────────────────────────────────────────────── */}
      <EditSheet visible={usernameOpen} onClose={() => setUsernameOpen(false)} title="Username" colors={colors}>
        <Text style={[inp.hint, { color: colors.muted, fontFamily: Fonts.body }]}>Your display name inside Ri Ri</Text>
        <TextInput
          style={[inp.field, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.elevated, fontFamily: Fonts.body, marginTop: 8 }]}
          placeholder="e.g. Hussyn"
          placeholderTextColor={colors.placeholder}
          value={usernameInput}
          onChangeText={setUsernameInput}
          autoCapitalize="words"
          maxLength={30}
          autoFocus
        />
        {!!usernameError && <Text style={[inp.err, { color: colors.danger, fontFamily: Fonts.body }]}>{usernameError}</Text>}
        <SaveButton onPress={handleUsernameSave} label={usernameLoading ? 'Saving…' : 'Save Username'} colors={colors} />
      </EditSheet>

      {/* ── Water Target Sheet ────────────────────────────────────────────── */}
      <EditSheet visible={waterOpen} onClose={() => { setWaterOpen(false); setWaterError(''); }} title="Daily Water Target" colors={colors}>
        <Text style={[inp.hint, { color: colors.muted, fontFamily: Fonts.body }]}>Enter target in litres (e.g. 3.5)</Text>
        <TextInput
          style={[inp.field, { color: colors.text, borderColor: colors.borderStrong, backgroundColor: colors.elevated, fontFamily: Fonts.body, marginTop: 8 }]}
          placeholder="3.0"
          placeholderTextColor={colors.placeholder}
          value={waterInput}
          onChangeText={setWaterInput}
          keyboardType="decimal-pad"
        />
        {waterError ? <Text style={[inp.hint, { color: '#E07070', fontFamily: Fonts.body, marginTop: 6 }]}>{waterError}</Text> : null}
        <SaveButton onPress={handleWaterSave} colors={colors} />
      </EditSheet>

      {/* ── Wake Time Sheet ───────────────────────────────────────────────── */}
      <EditSheet visible={wakeOpen} onClose={() => setWakeOpen(false)} title="Wake Time" colors={colors}>
        <Text style={[inp.hint, { color: colors.muted, fontFamily: Fonts.body }]}>
          {fmt12(wakeH, wakeM)}
        </Text>
        <TimePicker h={wakeH} m={wakeM} onHChange={setWakeH} onMChange={setWakeM} colors={colors} />
        <SaveButton onPress={handleWakeSave} colors={colors} />
      </EditSheet>

      {/* ── Sleep Time Sheet ──────────────────────────────────────────────── */}
      <EditSheet visible={sleepOpen} onClose={() => setSleepOpen(false)} title="Sleep Target" colors={colors}>
        <Text style={[inp.hint, { color: colors.muted, fontFamily: Fonts.body }]}>
          {fmt12(sleepH, sleepM)}
        </Text>
        <TimePicker h={sleepH} m={sleepM} onHChange={setSleepH} onMChange={setSleepM} colors={colors} />
        <SaveButton onPress={handleSleepSave} colors={colors} />
      </EditSheet>

      {/* ── Timezone Picker Modal ─────────────────────────────────────────── */}
      <Modal visible={tzOpen} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={() => setTzOpen(false)}>
        <Pressable style={es.backdrop} onPress={() => setTzOpen(false)} />
        <View style={[tz.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[es.handle, { backgroundColor: colors.borderStrong }]} />
          <Text style={[es.title, { color: colors.text, fontFamily: Fonts.display }]}>Home Timezone</Text>
          <View style={[tz.searchBox, { backgroundColor: colors.elevated, borderColor: colors.borderStrong }]}>
            <TextInput
              style={[tz.searchInput, { color: colors.text, fontFamily: Fonts.body }]}
              placeholder="Search timezones…"
              placeholderTextColor={colors.placeholder}
              value={tzSearch}
              onChangeText={setTzSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            {filteredTz.map((tz_item, i) => (
              <View key={tz_item}>
                {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 }} />}
                <Pressable
                  onPress={() => handleTzSave(tz_item)}
                  disabled={tzSaving}
                  style={({ pressed }) => [tz.tzRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[tz.tzLabel, { color: tz_item === timezone ? colors.primary : colors.text, fontFamily: Fonts.body }]}>
                    {tz_item}
                  </Text>
                  {tz_item === timezone && (
                    <View style={[tz.checkDot, { backgroundColor: colors.primary }]} />
                  )}
                </Pressable>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>
    </ScreenTransition>
  );
}

// ── time picker widget ─────────────────────────────────────────────────────────

function TimePicker({
  h, m, onHChange, onMChange, colors,
}: {
  h: number; m: number;
  onHChange: (v: number) => void;
  onMChange: (v: number) => void;
  colors: typeof Colors.dark;
}) {
  return (
    <View style={tp.row}>
      <SpinBox
        value={h} label="HH"
        onInc={() => onHChange((h + 1) % 24)}
        onDec={() => onHChange((h - 1 + 24) % 24)}
        display={String(h).padStart(2, '0')}
        colors={colors}
      />
      <Text style={[tp.colon, { color: colors.textSecondary }]}>:</Text>
      <SpinBox
        value={m} label="MM"
        onInc={() => onMChange((m + 15) % 60)}
        onDec={() => onMChange((m - 15 + 60) % 60)}
        display={String(m).padStart(2, '0')}
        colors={colors}
      />
    </View>
  );
}

function SpinBox({
  display, label, onInc, onDec, colors,
}: {
  value: number; display: string; label: string;
  onInc: () => void; onDec: () => void;
  colors: typeof Colors.dark;
}) {
  return (
    <View style={tp.spinBox}>
      <Pressable onPress={onInc} style={({ pressed }) => [tp.spinBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.5 : 1 }]}>
        <Text style={[tp.spinArrow, { color: colors.text }]}>▲</Text>
      </Pressable>
      <View style={[tp.spinValue, { backgroundColor: colors.elevated, borderColor: colors.borderStrong }]}>
        <Text style={[tp.spinNum, { color: colors.text, fontFamily: Fonts.display }]}>{display}</Text>
        <Text style={[tp.spinLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>{label}</Text>
      </View>
      <Pressable onPress={onDec} style={({ pressed }) => [tp.spinBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.5 : 1 }]}>
        <Text style={[tp.spinArrow, { color: colors.text }]}>▼</Text>
      </Pressable>
    </View>
  );
}

const tp = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 4 },
  colon:    { fontSize: 32, fontWeight: '300', marginBottom: 20 },
  spinBox:  { alignItems: 'center', gap: 8 },
  spinBtn:  { borderRadius: 10, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 8 },
  spinArrow:{ fontSize: 13 },
  spinValue:{ borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center', minWidth: 72 },
  spinNum:  { fontSize: 32, letterSpacing: -1 },
  spinLabel:{ fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
});

const inp = StyleSheet.create({
  field: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15 },
  err:   { fontSize: 13, marginTop: 8 },
  hint:  { fontSize: 13, marginBottom: 4 },
});

const s = StyleSheet.create({
  root:        { flex: 1 },
  content:     { padding: 20, paddingTop: 52, paddingBottom: 20 },
  header:      { marginBottom: 28 },
  headerSub:   { fontSize: 13, letterSpacing: 0.2, marginBottom: 4 },
  headerTitle: { fontSize: 36, letterSpacing: -1.5 },
});

const tz = StyleSheet.create({
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28 },
  searchBox:  { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 2, marginBottom: 14 },
  searchInput:{ fontSize: 14, paddingVertical: 10 },
  tzRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  tzLabel:    { fontSize: 15, letterSpacing: -0.1 },
  checkDot:   { width: 8, height: 8, borderRadius: 4 },
});
