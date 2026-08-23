import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { VoiceInput } from '@/components/ai/VoiceInput';
import { AIActionSheet } from '@/components/ai/AIActionSheet';
import { todayDateISO } from '@/lib/scheduler/engine';
import { executeAIAction } from '@/lib/ai/actions';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWaterStore } from '@/stores/waterStore';
import { useHabitStore } from '@/stores/habitStore';
import { useAIStore } from '@/stores/aiStore';
import { useAIPrefsStore } from '@/stores/aiPrefsStore';
import { useAIMemoryStore, MEMORY_CATEGORIES, type MemoryCategory } from '@/stores/aiMemoryStore';
import { useAIActionLogStore } from '@/stores/aiActionLogStore';
import { HABIT_KEYS } from '@/stores/habitStore';
import type { AIContext } from '@/lib/ai/client';
import { ScreenTransition } from '@/components/ui/ScreenTransition';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

const SUGGESTIONS = [
  "What should I do right now?",
  "Move my gym block 30 minutes later",
  "How did I do today?",
  "Plan tomorrow",
  "I'm running 40 minutes late",
  "Make today's schedule lighter",
];

function SuggestionChip({ text, index, onPress, colors }: { text: string; index: number; onPress: () => void; colors: typeof Colors.dark }) {
  const translateX  = useRef(new Animated.Value(40)).current;
  const opAnim      = useRef(new Animated.Value(0)).current;
  const pressScale  = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const delay = index * 65;
    Animated.parallel([
      Animated.timing(opAnim,     { toValue: 1, duration: 280, delay, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, tension: 90, friction: 14, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  const press   = () => Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true, speed: 80, bounciness: 0 }).start();
  const release = () => Animated.spring(pressScale, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={press} onPressOut={release}>
      <Animated.View style={[s.chip, {
        backgroundColor: colors.surface,
        borderColor: 'rgba(174,187,209,0.32)',
        opacity: opAnim,
        transform: [{ translateX }, { scale: pressScale }],
      }]}>
        <Text style={[s.chipText, { color: '#D4E3F5', fontFamily: Fonts.body }]}>{text}</Text>
      </Animated.View>
    </Pressable>
  );
}

function formatTs(ts: number) {
  const d = new Date(ts);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Three pulsing dots ────────────────────────────────────────────────────────

function ThinkingDots({ colors }: { colors: typeof Colors.dark }) {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue:  0, duration: 280, useNativeDriver: true }),
          Animated.delay(300),
        ]),
      );
    const a1 = make(d1,   0);
    const a2 = make(d2, 180);
    const a3 = make(d3, 360);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 4 }}>
      {[d1, d2, d3].map((d, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.muted, transform: [{ translateY: d }] }} />
      ))}
    </View>
  );
}

function StatusDot({ loading, colors }: { loading: boolean; colors: typeof Colors.dark }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!loading) { scale.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.6, duration: 500, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,   duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [loading]);
  return (
    <Animated.View style={[s.statusDot, { backgroundColor: loading ? colors.warning : colors.success, transform: [{ scale }] }]} />
  );
}

function WaveformBars({ color }: { color: string }) {
  const anims = useRef(Array.from({ length: 7 }, () => new Animated.Value(4))).current;
  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const maxH = 8 + (i % 4) * 6;
      return Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: maxH, duration: 230 + i * 45, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 4,    duration: 230 + i * 45, useNativeDriver: false }),
      ]));
    });
    loops.forEach((l, i) => setTimeout(() => l.start(), i * 30));
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {anims.map((anim, i) => (
        <Animated.View key={i} style={{ width: 3, borderRadius: 2, backgroundColor: color, height: anim }} />
      ))}
    </View>
  );
}

function Bubble({ msg, colors, isNew }: { msg: Message; colors: typeof Colors.dark; isNew: boolean }) {
  const isUser  = msg.role === 'user';
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const slideY  = useRef(new Animated.Value(isNew ? 14 : 0)).current;
  const [displayText, setDisplayText] = useState(isNew && !isUser ? '' : msg.text);
  const [showCursor, setShowCursor]   = useState(false);

  useEffect(() => {
    if (!isNew) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slideY,  { toValue: 0, tension: 120, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isNew || isUser) return;
    setShowCursor(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayText(msg.text.slice(0, i));
      if (i >= msg.text.length) { clearInterval(id); setShowCursor(false); }
    }, 14);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View style={[bub.row, isUser ? bub.rowUser : bub.rowAI, { opacity, transform: [{ translateY: slideY }] }]}>
      {!isUser && (
        <View style={[bub.avatar, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
          <Text style={[bub.avatarText, { color: colors.primary, fontFamily: Fonts.display }]}>R</Text>
        </View>
      )}
      <View style={[bub.bubble, isUser ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[bub.text, { color: isUser ? '#AEBBD1' : colors.text, fontFamily: Fonts.body }]}>
          {displayText}
          {showCursor && <Text style={{ color: colors.primary, opacity: 0.85 }}>|</Text>}
        </Text>
        <Text style={[bub.ts, { color: isUser ? 'rgba(174,187,209,0.45)' : colors.placeholder }]}>{formatTs(msg.ts)}</Text>
      </View>
    </Animated.View>
  );
}

const bub = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 10 },
  rowUser:  { justifyContent: 'flex-end' },
  rowAI:    { justifyContent: 'flex-start' },
  avatar:   { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 15 },
  bubble:   { maxWidth: '80%', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 13, gap: 5 },
  text:     { fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  ts:       { fontSize: 10, letterSpacing: 0.3 },
});

// ── AI Settings Sheet ─────────────────────────────────────────────────────────

function detectProvider(key: string): string {
  if (key.startsWith('AIza')) return 'Google Gemini';
  if (key.startsWith('gsk_')) return 'Groq';
  if (key.startsWith('sk-ant')) return 'Anthropic';
  if (key.startsWith('sk-')) return 'OpenAI';
  if (key.length > 20) return 'Custom';
  return '';
}

function ProviderSlot({
  label, slotKey, setSlotKey, model, setModel,
  models, fetching, fetchError, onFetch, colors, isActive, onActivate,
}: {
  label: string; slotKey: string; setSlotKey: (v: string) => void;
  model: string; setModel: (v: string) => void;
  models: string[]; fetching: boolean; fetchError: string | null;
  onFetch: () => void; colors: typeof Colors.dark;
  isActive: boolean; onActivate: () => void;
}) {
  const [hidden, setHidden] = useState(true);
  const provider = detectProvider(slotKey);

  return (
    <View style={[ps.card, { borderColor: isActive ? 'rgba(145,164,199,0.50)' : 'rgba(145,164,199,0.14)', backgroundColor: isActive ? 'rgba(145,164,199,0.06)' : colors.elevated }]}>
      {/* Card header */}
      <View style={ps.cardHeader}>
        <View style={ps.cardHeaderLeft}>
          <View style={[ps.slotDot, { backgroundColor: isActive ? '#91A4C7' : 'rgba(145,164,199,0.30)' }]} />
          <Text style={[ps.slotLabel, { color: colors.textSecondary, fontFamily: Fonts.body }]}>{label}</Text>
          {provider ? (
            <View style={[ps.providerTag, { borderColor: 'rgba(145,164,199,0.30)', backgroundColor: 'rgba(145,164,199,0.10)' }]}>
              <Text style={[ps.providerTxt, { color: '#91A4C7', fontFamily: Fonts.body }]}>{provider}</Text>
            </View>
          ) : null}
        </View>
        <Pressable onPress={onActivate} style={[ps.activeBtn, { borderColor: isActive ? '#91A4C7' : colors.borderStrong, backgroundColor: isActive ? 'rgba(145,164,199,0.15)' : 'transparent' }]}>
          <Text style={[ps.activeTxt, { color: isActive ? '#91A4C7' : colors.placeholder, fontFamily: Fonts.body }]}>
            {isActive ? 'Active' : 'Set active'}
          </Text>
        </Pressable>
      </View>

      {/* API Key row */}
      <View style={[ps.inputRow, { backgroundColor: colors.background, borderColor: 'rgba(145,164,199,0.16)' }]}>
        <TextInput
          style={[ps.input, { color: '#D4E3F5', fontFamily: Fonts.body }]}
          value={slotKey}
          onChangeText={setSlotKey}
          placeholder="Paste your API key…"
          placeholderTextColor="rgba(145,164,199,0.30)"
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={() => setHidden(h => !h)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[ps.eyeTxt, { color: hidden ? colors.placeholder : '#91A4C7', fontFamily: Fonts.body }]}>
            {hidden ? 'Show' : 'Hide'}
          </Text>
        </Pressable>
      </View>

      {/* Model fetch + picker */}
      <View style={ps.modelHeader}>
        <Text style={[ps.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>MODEL</Text>
        <Pressable onPress={onFetch} disabled={fetching || !slotKey.trim()} style={({ pressed }) => [ps.fetchBtn, { borderColor: 'rgba(145,164,199,0.30)', opacity: (fetching || !slotKey.trim()) ? 0.4 : pressed ? 0.6 : 1 }]}>
          <Text style={[ps.fetchTxt, { color: '#91A4C7', fontFamily: Fonts.body }]}>{fetching ? 'Fetching…' : 'Fetch models'}</Text>
        </Pressable>
      </View>
      {fetchError ? <Text style={[ps.errTxt, { color: colors.danger, fontFamily: Fonts.body }]}>{fetchError}</Text> : null}

      {models.length > 0 ? (
        <View style={ps.modelRow}>
          {models.slice(0, 10).map(id => (
            <Pressable key={id} onPress={() => setModel(id)} style={[ps.modelChip, { borderColor: model === id ? '#91A4C7' : 'rgba(145,164,199,0.18)', backgroundColor: model === id ? 'rgba(145,164,199,0.15)' : 'transparent' }]}>
              <Text style={[ps.modelTxt, { color: model === id ? '#D4E3F5' : colors.placeholder, fontFamily: Fonts.body }]} numberOfLines={1}>
                {id.replace('models/', '')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={ps.modelRow}>
          <View style={[ps.modelChip, { borderColor: 'rgba(145,164,199,0.20)', backgroundColor: 'rgba(145,164,199,0.06)' }]}>
            <Text style={[ps.modelTxt, { color: model ? '#91A4C7' : colors.placeholder, fontFamily: Fonts.body }]} numberOfLines={1}>
              {model || 'Fetch to see available models'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const ps = StyleSheet.create({
  card:         { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotDot:      { width: 8, height: 8, borderRadius: 4 },
  slotLabel:    { fontSize: 11, letterSpacing: 0.8 },
  providerTag:  { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  providerTxt:  { fontSize: 10, letterSpacing: 0.4 },
  activeBtn:    { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  activeTxt:    { fontSize: 11, letterSpacing: 0.3 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 0, gap: 8, marginBottom: 12 },
  input:        { flex: 1, fontSize: 13, paddingVertical: 12, letterSpacing: 0.1 },
  eyeTxt:       { fontSize: 12, paddingRight: 4 },
  modelHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionLabel: { fontSize: 9, letterSpacing: 1.2 },
  fetchBtn:     { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  fetchTxt:     { fontSize: 11, letterSpacing: 0.3 },
  errTxt:       { fontSize: 11, marginBottom: 6 },
  modelRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modelChip:    { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '48%' },
  modelTxt:     { fontSize: 12, letterSpacing: -0.1 },
});

function AISettingsSheet({ visible, onClose, colors }: { visible: boolean; onClose: () => void; colors: typeof Colors.dark }) {
  const { prefs, update, load, fetchModels, availableModels, modelsFetching, modelsError } = useAIPrefsStore();
  const [slot1Key, setSlot1Key] = useState('');
  const [slot2Key, setSlot2Key] = useState('');
  const [slot1Models, setSlot1Models] = useState<string[]>([]);
  const [slot2Models, setSlot2Models] = useState<string[]>([]);
  const [slot1Fetching, setS1F] = useState(false);
  const [slot2Fetching, setS2F] = useState(false);
  const [slot1Error,    setS1E] = useState<string | null>(null);
  const [slot2Error,    setS2E] = useState<string | null>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (visible) { setSlot1Key(prefs.geminiKey); setSlot2Key(prefs.groqKey); }
  }, [visible]);

  async function fetchSlot(slot: 1 | 2) {
    const key = slot === 1 ? slot1Key : slot2Key;
    if (!key.trim()) return;
    if (slot === 1) setS1F(true); else setS2F(true);
    if (slot === 1) setS1E(null); else setS2E(null);
    try {
      await update(slot === 1 ? { geminiKey: key } : { groqKey: key, provider: 'groq' });
      if (slot === 2) await update({ provider: 'groq' });
      else            await update({ provider: 'gemini' });
      await fetchModels();
      const models = useAIPrefsStore.getState().availableModels;
      if (slot === 1) setSlot1Models(models); else setSlot2Models(models);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to fetch';
      if (slot === 1) setS1E(msg); else setS2E(msg);
    } finally {
      if (slot === 1) setS1F(false); else setS2F(false);
    }
  }

  function ChipRow<T extends string>({ label, options, value, onSelect }: { label: string; options: { id: T; label: string }[]; value: T; onSelect: (v: T) => void }) {
    return (
      <>
        <Text style={[as.label, { color: colors.muted, fontFamily: Fonts.body }]}>{label}</Text>
        <View style={as.row}>
          {options.map((o) => (
            <Pressable key={o.id} onPress={() => onSelect(o.id)} style={[as.chip, { borderColor: value === o.id ? colors.primary : colors.borderStrong, backgroundColor: value === o.id ? colors.primary + '18' : 'transparent' }]}>
              <Text style={[as.chipTxt, { color: value === o.id ? colors.primary : colors.muted, fontFamily: Fonts.body }]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </>
    );
  }

  async function save() {
    await update({ geminiKey: slot1Key, groqKey: slot2Key });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <Pressable style={as.backdrop} onPress={onClose} />
      <View style={[as.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[as.handle, { backgroundColor: colors.borderStrong }]} />
        <Text style={[as.title, { color: colors.text, fontFamily: Fonts.display }]}>AI Providers</Text>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Two open provider slots */}
          <Text style={[as.label, { color: colors.muted, fontFamily: Fonts.body }]}>SLOT 1 — PRIMARY</Text>
          <ProviderSlot
            label="Primary" slotKey={slot1Key} setSlotKey={setSlot1Key}
            model={prefs.geminiModel} setModel={(v) => update({ geminiModel: v })}
            models={slot1Models.length > 0 ? slot1Models : availableModels.length > 0 && prefs.provider === 'gemini' ? availableModels : []}
            fetching={slot1Fetching} fetchError={slot1Error}
            onFetch={() => fetchSlot(1)}
            colors={colors}
            isActive={prefs.provider === 'gemini'}
            onActivate={() => update({ provider: 'gemini' })}
          />

          <Text style={[as.label, { color: colors.muted, fontFamily: Fonts.body }]}>SLOT 2 — FALLBACK</Text>
          <ProviderSlot
            label="Fallback" slotKey={slot2Key} setSlotKey={setSlot2Key}
            model={prefs.groqModel} setModel={(v) => update({ groqModel: v })}
            models={slot2Models.length > 0 ? slot2Models : availableModels.length > 0 && prefs.provider === 'groq' ? availableModels : []}
            fetching={slot2Fetching} fetchError={slot2Error}
            onFetch={() => fetchSlot(2)}
            colors={colors}
            isActive={prefs.provider === 'groq'}
            onActivate={() => update({ provider: 'groq' })}
          />

          <ChipRow label="TONE" options={[{ id: 'concise', label: 'Concise' }, { id: 'balanced', label: 'Balanced' }, { id: 'detailed', label: 'Detailed' }]} value={prefs.tone} onSelect={(v) => update({ tone: v })} />
          <ChipRow label="PERSONALITY" options={[{ id: 'casual', label: 'Casual' }, { id: 'formal', label: 'Formal' }]} value={prefs.personality} onSelect={(v) => update({ personality: v })} />
          <ChipRow label="CONFIRMATIONS" options={[{ id: 'always', label: 'Always' }, { id: 'smart', label: 'Smart' }, { id: 'never', label: 'Never' }]} value={prefs.confirmBehavior} onSelect={(v) => update({ confirmBehavior: v })} />

          <View style={[as.secNote, { backgroundColor: colors.elevated, borderColor: colors.borderStrong }]}>
            <Text style={[as.secText, { color: colors.muted, fontFamily: Fonts.body }]}>Keys are stored locally on this device only and never sent to any server other than the AI provider.</Text>
          </View>

          <Pressable onPress={save} style={({ pressed }) => [as.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[as.saveTxt, { color: '#0A1628', fontFamily: Fonts.bodyBold }]}>Save Settings</Text>
          </Pressable>
          <View style={{ height: 28 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const as = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 0, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title:  { fontSize: 26, letterSpacing: -0.8, marginBottom: 4 },
  label:  { fontSize: 10, letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  row:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:   { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  chipTxt:{ fontSize: 14, letterSpacing: -0.1 },
  secNote:  { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 16 },
  secText:  { fontSize: 12, lineHeight: 18, letterSpacing: 0.1 },
  saveBtn:  { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveTxt:  { fontSize: 15, letterSpacing: 0.2 },
});

// ── Memory Tab ────────────────────────────────────────────────────────────────

function MemoryTab({ colors, userId }: { colors: typeof Colors.dark; userId: string }) {
  const { memories, isLoading, load, addMemory, updateMemory, deleteMemory } = useAIMemoryStore();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [text, setText]       = useState('');
  const [cat,  setCat]        = useState<MemoryCategory>('general');

  useEffect(() => { load(userId); }, [userId]);

  async function handleSave() {
    if (!text.trim()) return;
    if (editId) {
      await updateMemory(editId, text.trim());
      setEditId(null);
    } else {
      await addMemory(userId, text.trim(), cat);
    }
    setText(''); setCat('general'); setAddOpen(false);
  }

  function handleEdit(id: string, content: string) {
    setEditId(id); setText(content); setCat('general'); setAddOpen(true);
  }

  function handleDelete(id: string) {
    Alert.alert('Delete Memory', 'Remove this memory from RiRi?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMemory(id) },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={mt.list} showsVerticalScrollIndicator={false}>
        <View style={mt.topRow}>
          <Text style={[mt.heading, { color: colors.text, fontFamily: Fonts.display }]}>Memory</Text>
          <Pressable onPress={() => { setEditId(null); setText(''); setCat('general'); setAddOpen(true); }} style={({ pressed }) => [mt.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[mt.addTxt, { fontFamily: Fonts.body }]}>+ Add</Text>
          </Pressable>
        </View>
        <Text style={[mt.sub, { color: colors.muted, fontFamily: Fonts.body }]}>
          RiRi remembers these preferences and uses them when planning your schedule.
        </Text>

        {isLoading && <Text style={[{ color: colors.placeholder, fontFamily: Fonts.body, marginTop: 16, textAlign: 'center' }]}>Loading…</Text>}

        {!isLoading && memories.length === 0 && (
          <View style={mt.empty}>
            <Text style={[mt.emptyTxt, { color: colors.placeholder, fontFamily: Fonts.body }]}>No memories yet.</Text>
            <Text style={[mt.emptyHint, { color: colors.placeholder, fontFamily: Fonts.body }]}>
              Say "Remember that I prefer client calls at night" or tap + Add above.
            </Text>
          </View>
        )}

        {memories.map((m) => (
          <View key={m.id} style={[mt.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={mt.cardTop}>
              <View style={[mt.catBadge, { backgroundColor: colors.accentTint }]}>
                <Text style={[mt.catTxt, { color: colors.primary, fontFamily: Fonts.body }]}>{m.category}</Text>
              </View>
              <Text style={[mt.time, { color: colors.placeholder, fontFamily: Fonts.body }]}>{formatRelativeTime(m.createdAt)}</Text>
            </View>
            <Text style={[mt.content, { color: colors.text, fontFamily: Fonts.body }]}>{m.content}</Text>
            <View style={mt.actions}>
              <Pressable onPress={() => handleEdit(m.id, m.content)} style={({ pressed }) => [mt.actionBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.5 : 1 }]}>
                <Text style={[mt.actionTxt, { color: colors.muted, fontFamily: Fonts.body }]}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(m.id)} style={({ pressed }) => [mt.actionBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.5 : 1 }]}>
                <Text style={[mt.actionTxt, { color: colors.danger, fontFamily: Fonts.body }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add/Edit sheet */}
      <Modal visible={addOpen} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAddOpen(false)} />
        <View style={[mt.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[{ width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18, backgroundColor: colors.borderStrong }]} />
          <Text style={[mt.sheetTitle, { color: colors.text, fontFamily: Fonts.display }]}>{editId ? 'Edit Memory' : 'New Memory'}</Text>

          {!editId && (
            <>
              <Text style={[mt.label, { color: colors.muted, fontFamily: Fonts.body }]}>CATEGORY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {MEMORY_CATEGORIES.map((c) => (
                  <Pressable key={c} onPress={() => setCat(c)} style={[mt.catChip, { borderColor: cat === c ? colors.primary : colors.borderStrong, backgroundColor: cat === c ? colors.primary + '18' : 'transparent' }]}>
                    <Text style={[{ fontSize: 13, fontFamily: Fonts.body, color: cat === c ? colors.primary : colors.muted }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[mt.label, { color: colors.muted, fontFamily: Fonts.body }]}>PREFERENCE</Text>
          <TextInput
            style={[mt.textInput, { color: colors.text, backgroundColor: colors.elevated, borderColor: colors.borderStrong, fontFamily: Fonts.body }]}
            placeholder="e.g. I prefer client calls after 8 PM"
            placeholderTextColor={colors.placeholder}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={300}
          />
          <Pressable onPress={handleSave} style={({ pressed }) => [mt.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}>
            <Text style={[mt.saveTxt, { fontFamily: Fonts.bodyBold }]}>{editId ? 'Update' : 'Save Memory'}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const mt = StyleSheet.create({
  list:     { padding: 20, paddingTop: 16 },
  topRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  heading:  { fontSize: 28, letterSpacing: -0.8 },
  sub:      { fontSize: 13, lineHeight: 18, marginBottom: 20 },
  addBtn:   { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addTxt:   { fontSize: 13, color: '#080A0E', letterSpacing: 0.2 },
  card:     { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  catTxt:   { fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  time:     { fontSize: 11 },
  content:  { fontSize: 15, lineHeight: 22, letterSpacing: -0.1, marginBottom: 12 },
  actions:  { flexDirection: 'row', gap: 8 },
  actionBtn:{ borderRadius: 9, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  actionTxt:{ fontSize: 12, letterSpacing: 0.1 },
  empty:    { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyTxt: { fontSize: 16 },
  emptyHint:{ fontSize: 13, lineHeight: 18, textAlign: 'center', maxWidth: 260 },
  sheet:    { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  sheetTitle: { fontSize: 22, letterSpacing: -0.8, marginBottom: 20 },
  label:    { fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  catChip:  { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  textInput:{ borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 15, lineHeight: 22, minHeight: 90, textAlignVertical: 'top', marginBottom: 16 },
  saveBtn:  { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveTxt:  { fontSize: 15, color: '#080A0E', letterSpacing: 0.2 },
});

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ colors }: { colors: typeof Colors.dark }) {
  const { todayBlocks, load: loadSchedule } = useScheduleStore();
  const { todayTotalMl }  = useWaterStore();
  const { todayHabits }   = useHabitStore();
  const { recentLogs, isLoading, loadRecent, markUndone } = useAIActionLogStore();
  const user = useAuthStore((s) => s.user);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  useEffect(() => { if (user) loadRecent(user.id); }, [user?.id]);

  async function handleUndo(log: (typeof recentLogs)[0]) {
    if (!user || !log.reversalPayload || log.undone) return;
    setUndoingId(log.id);
    try {
      const parsed = JSON.parse(log.reversalPayload);
      const result = await executeAIAction(
        { type: 'change_schedule' as const, payload: parsed, description: `Undo: ${log.description}` },
        user.id,
      );
      if (result.success) {
        await markUndone(log.id);
        loadSchedule(user.id, todayDateISO());
      } else {
        Alert.alert('Undo failed', result.message);
      }
    } catch {
      Alert.alert('Undo failed', 'Could not reverse this action.');
    } finally {
      setUndoingId(null);
    }
  }

  const total     = todayBlocks.length;
  const completed = todayBlocks.filter((b) => b.status === 'completed').length;
  const skipped   = todayBlocks.filter((b) => b.status === 'skipped').length;
  const pending   = todayBlocks.filter((b) => b.status === 'pending' || b.status === 'in_progress').length;
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;
  const lateBlocks = todayBlocks.filter((b) => b.latenessMinutes > 0);
  const avgLate   = lateBlocks.length > 0
    ? Math.round(lateBlocks.reduce((acc, b) => acc + b.latenessMinutes, 0) / lateBlocks.length)
    : 0;

  const habitsCompleted = HABIT_KEYS.filter((k) => todayHabits[k]?.completed).length;
  const waterPct = Math.min(100, Math.round((todayTotalMl / 3000) * 100));

  function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min(1, value / max) : 0;
    const fillAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.spring(fillAnim, { toValue: pct, tension: 50, friction: 14, useNativeDriver: false }).start();
    }, [pct]);
    const width = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    return (
      <View style={at.statRow}>
        <Text style={[at.statLabel, { color: colors.muted, fontFamily: Fonts.body }]}>{label}</Text>
        <View style={[at.barTrack, { backgroundColor: colors.elevated }]}>
          <Animated.View style={[at.barFill, { width, backgroundColor: color }]} />
        </View>
        <Text style={[at.statVal, { color, fontFamily: Fonts.display }]}>{value}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={at.list} showsVerticalScrollIndicator={false}>
      <Text style={[at.heading, { color: colors.text, fontFamily: Fonts.display }]}>Analytics</Text>
      <Text style={[at.sub, { color: colors.muted, fontFamily: Fonts.body }]}>Today's performance snapshot</Text>

      {/* Score ring */}
      <View style={[at.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={at.scoreRow}>
          <View>
            <Text style={[at.scoreNum, { color: colors.primary, fontFamily: Fonts.display }]}>{rate}%</Text>
            <Text style={[at.scoreLabel, { color: colors.muted, fontFamily: Fonts.body }]}>completion rate</Text>
          </View>
          <View style={at.scoreStats}>
            <Text style={[at.scoreStat, { color: colors.success, fontFamily: Fonts.body }]}>{completed} done</Text>
            <Text style={[at.scoreStat, { color: colors.muted, fontFamily: Fonts.body }]}>{skipped} skipped</Text>
            <Text style={[at.scoreStat, { color: colors.placeholder, fontFamily: Fonts.body }]}>{pending} left</Text>
          </View>
        </View>
        {avgLate > 0 && (
          <Text style={[at.lateNote, { color: colors.warning, fontFamily: Fonts.body }]}>Avg {avgLate}m late on delayed tasks</Text>
        )}
      </View>

      <Text style={[at.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>Today</Text>
      <View style={[at.barCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StatBar label="Schedule" value={completed} max={total} color={colors.primary} />
        <StatBar label="Habits"   value={habitsCompleted} max={HABIT_KEYS.length} color={colors.success} />
        <StatBar label="Water"    value={waterPct} max={100} color='#91A4C7' />
      </View>

      {/* AI Action History */}
      <Text style={[at.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body, marginTop: 20 }]}>AI Action History</Text>
      {isLoading && <Text style={[{ color: colors.placeholder, fontFamily: Fonts.body, textAlign: 'center', paddingVertical: 16 }]}>Loading…</Text>}
      {!isLoading && recentLogs.length === 0 && (
        <Text style={[{ color: colors.placeholder, fontFamily: Fonts.body, paddingVertical: 16, textAlign: 'center' }]}>No AI actions yet.</Text>
      )}
      {recentLogs.slice(0, 20).map((log) => (
        <View key={log.id} style={[at.logCard, { backgroundColor: colors.surface, borderColor: log.undone ? colors.border : 'rgba(145,164,199,0.20)', opacity: log.undone ? 0.5 : 1 }]}>
          <View style={at.logTop}>
            <View style={[at.logType, { backgroundColor: colors.accentTint }]}>
              <Text style={[at.logTypeTxt, { color: colors.primary, fontFamily: Fonts.body }]}>{log.actionType.replace('_', ' ')}</Text>
            </View>
            <Text style={[at.logTime, { color: colors.placeholder, fontFamily: Fonts.body }]}>{formatRelativeTime(log.createdAt)}</Text>
          </View>
          <Text style={[at.logDesc, { color: log.undone ? colors.muted : colors.text, fontFamily: Fonts.body }]}>{log.description}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 }}>
            {log.undone ? (
              <Text style={[at.logUndone, { color: colors.placeholder, fontFamily: Fonts.body }]}>Undone</Text>
            ) : log.reversalPayload ? (
              <Pressable
                onPress={() => handleUndo(log)}
                disabled={undoingId === log.id}
                style={({ pressed }) => [at.undoBtn, { borderColor: colors.borderStrong, opacity: pressed || undoingId === log.id ? 0.5 : 1 }]}
              >
                <Text style={[at.undoTxt, { color: colors.warning, fontFamily: Fonts.body }]}>
                  {undoingId === log.id ? 'Undoing…' : 'Undo'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const at = StyleSheet.create({
  list:        { padding: 20, paddingTop: 16 },
  heading:     { fontSize: 28, letterSpacing: -0.8, marginBottom: 6 },
  sub:         { fontSize: 13, marginBottom: 20 },
  sectionLabel:{ fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12, marginTop: 4 },
  scoreCard:   { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 20 },
  scoreRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreNum:    { fontSize: 44, letterSpacing: -2, lineHeight: 48 },
  scoreLabel:  { fontSize: 12, letterSpacing: 0.2, marginTop: 2 },
  scoreStats:  { gap: 4 },
  scoreStat:   { fontSize: 13, letterSpacing: -0.1 },
  lateNote:    { fontSize: 12, marginTop: 10, letterSpacing: 0.1 },
  barCard:     { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
  statRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statLabel:   { fontSize: 13, width: 64 },
  barTrack:    { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:     { height: 6, borderRadius: 3 },
  statVal:     { fontSize: 15, width: 36, textAlign: 'right', letterSpacing: -0.5 },
  logCard:     { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  logTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  logType:     { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  logTypeTxt:  { fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  logTime:     { fontSize: 11 },
  logDesc:     { fontSize: 14, lineHeight: 20, letterSpacing: -0.1 },
  logUndone:   { fontSize: 11, letterSpacing: 0.2 },
  undoBtn:     { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  undoTxt:     { fontSize: 11, letterSpacing: 0.3 },
});

// ── Tab bar ───────────────────────────────────────────────────────────────────

type Tab = 'chat' | 'memory' | 'analytics';

function TabBar({ active, onChange, colors }: { active: Tab; onChange: (t: Tab) => void; colors: typeof Colors.dark }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'chat',      label: 'Chat'      },
    { id: 'memory',    label: 'Memory'    },
    { id: 'analytics', label: 'Analytics' },
  ];
  return (
    <View style={[tb.bar, { borderBottomColor: colors.border }]}>
      {tabs.map((t) => (
        <Pressable key={t.id} onPress={() => onChange(t.id)} style={[tb.tab, active === t.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
          <Text style={[tb.tabTxt, { color: active === t.id ? colors.text : colors.muted, fontFamily: active === t.id ? Fonts.display : Fonts.body }]}>{t.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const tb = StyleSheet.create({
  bar:    { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab:    { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt: { fontSize: 14, letterSpacing: -0.1 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AIScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const user   = useAuthStore((s) => s.user);
  const date   = todayDateISO();
  const { prefs } = useAIPrefsStore();

  const { todayBlocks, load } = useScheduleStore();
  const { todayTotalMl }      = useWaterStore();
  const { todayHabits }       = useHabitStore();

  const {
    isLoading: aiLoading, pendingActions, actionValidations, aiResponse, error: aiError,
    sendCommand, confirmActions, dismissActions,
  } = useAIStore();

  const [activeTab,    setActiveTab]    = useState<Tab>('chat');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages,     setMessages]     = useState<Message[]>([
    { id: '0', role: 'assistant', text: "Hello. I'm RiRi's AI. Ask me about your schedule, habits, or anything about your day.", ts: Date.now() },
  ]);
  const [showInput,  setShowInput]  = useState(false);
  const [inputText,  setInputText]  = useState('');
  const newestId   = useRef<string>('0');
  const inputRef   = useRef<TextInput>(null);
  const listRef    = useRef<FlatList>(null);
  const voiceScale = useRef(new Animated.Value(1)).current;

  const pulseScale   = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (aiLoading) { pulseOpacity.setValue(0); return; }
    pulseScale.setValue(1); pulseOpacity.setValue(0.35);
    const loop = Animated.loop(Animated.parallel([
      Animated.timing(pulseScale,   { toValue: 1.55, duration: 1400, useNativeDriver: true }),
      Animated.timing(pulseOpacity, { toValue: 0,    duration: 1400, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [aiLoading]);

  const showAISheet = pendingActions.length > 0 || (
    !!aiResponse && !aiLoading && !aiError &&
    aiResponse !== messages.find((m) => m.role === 'assistant' && m.text === aiResponse)?.text
  );

  function buildContext(): AIContext {
    return {
      date,
      blocks: todayBlocks.map((b) => ({
        id: b.id, title: b.title, category: b.category,
        scheduledStart: b.scheduledStart, scheduledEnd: b.scheduledEnd,
        status: b.status, templateId: b.templateId, isFlexWindow: b.isFlexWindow,
      })),
      waterMl: todayTotalMl,
      habitsCompleted: HABIT_KEYS.filter((k) => todayHabits[k]?.completed),
    };
  }

  async function send(text: string) {
    if (!text.trim() || !user || aiLoading) return;
    const userMsg: Message = { id: String(Date.now()), role: 'user', text: text.trim(), ts: Date.now() };
    newestId.current = userMsg.id;
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setShowInput(false);
    setActiveTab('chat');
    await sendCommand(text.trim(), buildContext(), user.id);
  }

  useEffect(() => {
    if (!aiResponse || aiLoading) return;
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg?.role === 'assistant' && lastMsg.text === aiResponse) return prev;
      const id = String(Date.now());
      newestId.current = id;
      return [...prev, { id, role: 'assistant', text: aiResponse, ts: Date.now() }];
    });
  }, [aiResponse, aiLoading]);

  useEffect(() => {
    if (!aiError) return;
    const id = String(Date.now());
    newestId.current = id;
    setMessages((prev) => [...prev, { id, role: 'assistant', text: `Sorry, something went wrong: ${aiError}`, ts: Date.now() }]);
  }, [aiError]);

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id, date]);

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [messages.length]);

  const [voicePressed, setVoicePressed] = useState(false);
  const pressVoice   = () => { setVoicePressed(true);  Animated.spring(voiceScale, { toValue: 0.88, useNativeDriver: true, speed: 60, bounciness: 4 }).start(); };
  const releaseVoice = () => { setVoicePressed(false); Animated.spring(voiceScale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 6 }).start(); };

  const thinkingAmbient = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!aiLoading) {
      Animated.timing(thinkingAmbient, { toValue: 0, duration: 500, useNativeDriver: false }).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(thinkingAmbient, { toValue: 1,   duration: 1100, useNativeDriver: false }),
      Animated.timing(thinkingAmbient, { toValue: 0.3, duration: 1100, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [aiLoading]);
  const ambientBg = thinkingAmbient.interpolate({ inputRange: [0, 1], outputRange: ['rgba(89,107,137,0)', 'rgba(89,107,137,0.08)'] });

  const hasUserMessages = messages.some((m) => m.role === 'user');

  return (
    <ScreenTransition>
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: 'transparent' }]}>
        <View>
          <Text style={[s.headerSub,   { color: colors.muted, fontFamily: Fonts.body }]}>
            {prefs.provider === 'groq' ? 'Groq' : prefs.provider === 'gemini' ? 'Gemini' : 'AI'} · {prefs.provider === 'groq' ? prefs.groqModel || 'no model' : prefs.geminiModel || 'no model'}
          </Text>
          <Text style={[s.headerTitle, { color: colors.text, fontFamily: Fonts.display }]}>AI Assistant</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: colors.muted }} />
              </View>
            </View>
          </Pressable>
          <StatusDot loading={aiLoading} colors={colors} />
        </View>
      </View>

      <TabBar active={activeTab} onChange={setActiveTab} colors={colors} />

      {activeTab === 'chat' && (
        <>
          {/* AI thinking atmosphere — subtle hue shift while loading */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: ambientBg }]} />
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <Bubble msg={item} colors={colors} isNew={item.id === newestId.current} />}
            contentContainerStyle={s.messageList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              aiLoading ? (
                <View style={[bub.row, bub.rowAI]}>
                  <View style={[bub.avatar, { backgroundColor: colors.surface, borderColor: colors.borderStrong }]}>
                    <Text style={[bub.avatarText, { color: colors.primary, fontFamily: Fonts.display }]}>R</Text>
                  </View>
                  <View style={[bub.bubble, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                    <ThinkingDots colors={colors} />
                  </View>
                </View>
              ) : null
            }
          />

          {!hasUserMessages && (
            <View style={s.suggestions}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                {SUGGESTIONS.map((item, i) => (
                  <SuggestionChip key={item} text={item} index={i} onPress={() => send(item)} colors={colors} />
                ))}
              </ScrollView>
            </View>
          )}

          {showInput && (
            <View style={[s.textBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <TextInput
                ref={inputRef}
                autoFocus
                style={[s.textInput, { color: colors.text, backgroundColor: colors.elevated, fontFamily: Fonts.body }]}
                placeholder="Type your message…"
                placeholderTextColor={colors.placeholder}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => send(inputText)}
                returnKeyType="send"
                multiline={false}
                maxLength={500}
              />
              <Pressable onPress={() => send(inputText)} disabled={!inputText.trim() || aiLoading} style={({ pressed }) => [s.sendBtn, { backgroundColor: colors.primary, opacity: !inputText.trim() || aiLoading ? 0.3 : pressed ? 0.7 : 1 }]}>
                <View style={s.sendArrow}>
                  <View style={[s.arrowStem, { backgroundColor: '#AEBBD1' }]} />
                  <View style={[s.arrowHead, { borderBottomColor: '#AEBBD1', borderLeftColor: '#AEBBD1' }]} />
                </View>
              </Pressable>
            </View>
          )}

          {!showInput && (
            <View style={[s.bottomBar, { backgroundColor: 'rgba(8,10,14,0.88)' }]}>
              <Pressable onPress={() => { setShowInput(true); setTimeout(() => inputRef.current?.focus(), 80); }} style={[s.textToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={s.keyboardGlyph}>
                  <View style={[s.kbRow, { backgroundColor: colors.textSecondary }]} />
                  <View style={[s.kbRow, { backgroundColor: colors.textSecondary, width: 20 }]} />
                  <View style={[s.kbRow, { backgroundColor: colors.textSecondary, width: 14 }]} />
                </View>
              </Pressable>
              <View style={s.voiceWrap}>
                <Animated.View style={[s.pulseRing, { borderColor: colors.primary, transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                <Pressable onPressIn={pressVoice} onPressOut={releaseVoice}>
                  <Animated.View style={[s.voiceCircle, { backgroundColor: colors.surface, borderColor: colors.borderStrong, transform: [{ scale: voiceScale }] }]}>
                    {voicePressed
                      ? <WaveformBars color={colors.primary} />
                      : <VoiceInput onResult={send} disabled={aiLoading} />
                    }
                  </Animated.View>
                </Pressable>
              </View>
              <View style={s.textToggle} />
            </View>
          )}
        </>
      )}

      {activeTab === 'memory' && user && (
        <MemoryTab colors={colors} userId={user.id} />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab colors={colors} />
      )}

      <AISettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} colors={colors} />

      <AIActionSheet
        visible={showAISheet}
        aiResponse={aiError ?? null}
        actions={pendingActions}
        actionValidations={actionValidations}
        isLoading={aiLoading}
        onConfirm={() => { if (!user) return; confirmActions(user.id, () => load(user.id, date)); }}
        onDismiss={dismissActions}
      />
    </KeyboardAvoidingView>
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSub:   { fontSize: 12, letterSpacing: 0.3, marginBottom: 3 },
  headerTitle: { fontSize: 32, letterSpacing: -1 },
  statusDot:   { width: 10, height: 10, borderRadius: 5 },
  messageList: { padding: 20, paddingTop: 16, paddingBottom: 8 },
  suggestions: { paddingVertical: 12 },
  chip:        { borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  chipText:    { fontSize: 14, letterSpacing: -0.1 },
  textBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  textInput:   { flex: 1, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, lineHeight: 22 },
  sendBtn:     { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendArrow:   { alignItems: 'center', justifyContent: 'center', width: 22, height: 22 },
  arrowStem:   { width: 2, height: 10, borderRadius: 1 },
  arrowHead:   { width: 8, height: 8, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '135deg' }], marginTop: -3 },
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
  },
  voiceWrap:   { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  pulseRing:   { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1.5 },
  voiceCircle: { width: 76, height: 76, borderRadius: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  textToggle:  { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keyboardGlyph: { gap: 4, alignItems: 'flex-start' },
  kbRow:       { height: 2, width: 24, borderRadius: 1 },
});
