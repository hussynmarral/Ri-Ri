import { useState } from 'react';
import {
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

import Colors, { Fonts, CATEGORY_COLOR } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useScheduleStore } from '@/stores/scheduleStore';
import type { BlockCategory } from '@/types';

const QUICK_CATS: { id: BlockCategory; label: string }[] = [
  { id: 'other',   label: 'Task'    },
  { id: 'agency',  label: 'Agency'  },
  { id: 'shopify', label: 'Shopify' },
  { id: 'gym',     label: 'Gym'     },
  { id: 'meal',    label: 'Meal'    },
  { id: 'reading', label: 'Reading' },
  { id: 'content', label: 'Content' },
  { id: 'flex',    label: 'Flex'    },
];

const DURATIONS = [30, 60, 90, 120];

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  date: string;
}

function roundToQuarter(mins: number) { return Math.round(mins / 15) * 15; }

function localISO(date: string, h: number, m: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function fmt12(h: number, m: number) {
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function AddTaskSheet({ visible, onClose, userId, date }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { addBlock } = useScheduleStore();

  const now = new Date();
  const [title,    setTitle]    = useState('');
  const [category, setCategory] = useState<BlockCategory>('other');
  const [hour,     setHour]     = useState(now.getHours());
  const [minute,   setMinute]   = useState(roundToQuarter(now.getMinutes()) % 60);
  const [duration, setDuration] = useState(60);
  const [saving,   setSaving]   = useState(false);

  function adjustTime(deltaMins: number) {
    const total   = hour * 60 + minute + deltaMins;
    const wrapped = ((total % 1440) + 1440) % 1440;
    setHour(Math.floor(wrapped / 60));
    setMinute(wrapped % 60);
  }

  async function handleAdd() {
    if (!title.trim() || !userId) return;
    setSaving(true);
    try {
      const startMins = hour * 60 + minute;
      const endMins   = (startMins + duration) % 1440;
      const end = localISO(date, Math.floor(endMins / 60), endMins % 60);
      await addBlock({
        userId,
        instanceDate: date,
        category,
        title: title.trim(),
        scheduledStart: localISO(date, hour, minute),
        scheduledEnd: end,
      });
      setTitle('');
      onClose();
    } catch (e) {
      console.error('AddTaskSheet: addBlock failed', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      {/* Dim backdrop */}
      <Pressable style={sh.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={sh.kav}
        pointerEvents="box-none"
      >
        <View style={[sh.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Drag handle */}
          <View style={[sh.handle, { backgroundColor: colors.borderStrong }]} />

          <Text style={[sh.title, { color: colors.text, fontFamily: Fonts.display }]}>Add Task</Text>

          {/* Title input */}
          <TextInput
            style={[sh.input, { color: colors.text, backgroundColor: colors.elevated, borderColor: colors.border, fontFamily: Fonts.body }]}
            placeholder="What needs doing…"
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />

          {/* Category chips */}
          <Text style={[sh.label, { color: colors.placeholder, fontFamily: Fonts.body }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sh.chipsScroll} contentContainerStyle={sh.chipsRow}>
            {QUICK_CATS.map((c) => {
              const active = category === c.id;
              const accent = (CATEGORY_COLOR as Record<string, string>)[c.id] ?? colors.primary;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  style={[
                    sh.chip,
                    {
                      backgroundColor: active ? accent + '20' : colors.elevated,
                      borderColor:     active ? accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[sh.chipText, { color: active ? accent : colors.muted, fontFamily: Fonts.body }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Start time */}
          <Text style={[sh.label, { color: colors.placeholder, fontFamily: Fonts.body }]}>Start time</Text>
          <View style={sh.timeRow}>
            <Pressable
              onPress={() => adjustTime(-15)}
              style={[sh.timeAdj, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Text style={[sh.timeAdjText, { color: colors.muted }]}>−15m</Text>
            </Pressable>
            <View style={[sh.timePill, { backgroundColor: colors.elevated }]}>
              <Text style={[sh.timeValue, { color: colors.text, fontFamily: Fonts.display }]}>
                {fmt12(hour, minute)}
              </Text>
            </View>
            <Pressable
              onPress={() => adjustTime(15)}
              style={[sh.timeAdj, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Text style={[sh.timeAdjText, { color: colors.muted }]}>+15m</Text>
            </Pressable>
          </View>

          {/* Duration */}
          <Text style={[sh.label, { color: colors.placeholder, fontFamily: Fonts.body }]}>Duration</Text>
          <View style={sh.durRow}>
            {DURATIONS.map((d) => {
              const active = duration === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[
                    sh.durBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.elevated,
                      borderColor:     active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[sh.durText, { color: active ? '#000' : colors.muted, fontFamily: Fonts.body }]}>
                    {d < 60 ? `${d}m` : `${d / 60}h`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Confirm */}
          <Pressable
            onPress={handleAdd}
            disabled={!title.trim() || saving}
            style={({ pressed }) => [
              sh.addBtn,
              {
                backgroundColor: title.trim() ? colors.primary : colors.elevated,
                opacity: (saving || pressed) ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[sh.addBtnText, { color: title.trim() ? '#000' : colors.placeholder, fontFamily: Fonts.display }]}>
              {saving ? 'Adding…' : 'Add to Schedule'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sh = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.8,
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    letterSpacing: -0.1,
  },

  chipsScroll: { marginHorizontal: -20 },
  chipsRow:   { paddingHorizontal: 20, gap: 8, flexDirection: 'row' },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13 },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeAdj: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  timeAdjText: { fontSize: 13, fontWeight: '600' },
  timePill: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeValue: {
    fontSize: 22,
    letterSpacing: -0.8,
  },

  durRow: { flexDirection: 'row', gap: 8 },
  durBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  durText: { fontSize: 14, fontWeight: '600' },

  addBtn: {
    marginTop: 22,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
});
