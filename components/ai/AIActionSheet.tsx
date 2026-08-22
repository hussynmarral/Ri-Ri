import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { AIAction } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  add_event: 'Add event',
  move_task: 'Move block',
  change_schedule: 'Change schedule',
  change_recurring: 'Edit recurring block',
  delete_recurring: 'Remove recurring block',
  bulk_reschedule: 'Bulk reschedule',
};

interface Props {
  visible: boolean;
  aiResponse: string;
  actions: AIAction[];
  isLoading: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function AIActionSheet({ visible, aiResponse, actions, isLoading, onConfirm, onDismiss }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.card }]}>
          {/* AI response text */}
          {aiResponse ? (
            <Text style={[s.responseText, { color: colors.text }]}>{aiResponse}</Text>
          ) : null}

          {/* Proposed actions */}
          {actions.length > 0 && (
            <>
              <Text style={[s.actionsLabel, { color: colors.muted }]}>Proposed changes</Text>
              <ScrollView style={s.actionsList} showsVerticalScrollIndicator={false}>
                {actions.map((action, i) => (
                  <View key={i} style={[s.actionRow, { borderColor: colors.border }]}>
                    <View style={[s.actionTypeBadge, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={[s.actionTypeText, { color: colors.primary }]}>
                        {ACTION_LABELS[action.type] ?? action.type}
                      </Text>
                    </View>
                    <Text style={[s.actionDesc, { color: colors.text }]}>{action.description}</Text>
                    {action.requiresConfirmation && (
                      <Text style={[s.confirmNote, { color: colors.warning }]}>Requires confirmation</Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity
              style={[s.btn, { borderColor: colors.border, borderWidth: 1 }]}
              onPress={onDismiss}
            >
              <Text style={[s.btnText, { color: colors.muted }]}>Cancel</Text>
            </TouchableOpacity>

            {actions.length > 0 && (
              <TouchableOpacity
                style={[s.btn, { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 }]}
                onPress={onConfirm}
                disabled={isLoading}
              >
                <Text style={[s.btnText, { color: '#fff' }]}>
                  {isLoading ? 'Applying…' : 'Apply'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '75%',
  },
  responseText: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  actionsLabel: {
    fontSize: 12, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 10,
  },
  actionsList: { maxHeight: 280 },
  actionRow: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  actionTypeBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  actionTypeText: { fontSize: 11, fontWeight: '700' },
  actionDesc: { fontSize: 14, lineHeight: 20 },
  confirmNote: { fontSize: 12, marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
