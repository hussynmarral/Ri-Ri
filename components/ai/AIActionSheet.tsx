import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { AIAction } from '@/types';
import type { ValidationResult } from '@/lib/ai/validator';

const ACTION_LABELS: Record<string, string> = {
  add_event: 'Add event',
  move_task: 'Move block',
  change_schedule: 'Change schedule',
  change_recurring: 'Edit recurring',
  delete_recurring: 'Remove recurring',
  bulk_reschedule: 'Bulk reschedule',
};

interface Props {
  visible: boolean;
  aiResponse: string | null;
  actions: AIAction[];
  actionValidations: ValidationResult[];
  isLoading: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function AIActionSheet({
  visible, aiResponse, actions, actionValidations, isLoading, onConfirm, onDismiss,
}: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const allValid = actionValidations.length === 0 ||
    actionValidations.every((v) => v.valid);
  const canApply = actions.length > 0 && allValid && !isLoading;

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
          {!!aiResponse && (
            <Text style={[s.responseText, { color: colors.text }]}>{aiResponse}</Text>
          )}

          {/* Proposed actions */}
          {actions.length > 0 && (
            <>
              <Text style={[s.actionsLabel, { color: colors.muted }]}>Proposed changes</Text>
              <ScrollView style={s.actionsList} showsVerticalScrollIndicator={false}>
                {actions.map((action, i) => {
                  const validation = actionValidations[i];
                  const isValid = !validation || validation.valid;
                  return (
                    <View
                      key={i}
                      style={[
                        s.actionRow,
                        {
                          borderColor: isValid ? colors.border : colors.danger,
                          backgroundColor: isValid ? 'transparent' : colors.danger + '10',
                        },
                      ]}
                    >
                      <View style={s.actionRowHeader}>
                        <View style={[s.actionTypeBadge, { backgroundColor: colors.primary + '22' }]}>
                          <Text style={[s.actionTypeText, { color: colors.primary }]}>
                            {ACTION_LABELS[action.type] ?? action.type}
                          </Text>
                        </View>
                        {validation && (
                          <Text style={{ fontSize: 16 }}>{isValid ? '✓' : '✗'}</Text>
                        )}
                      </View>

                      <Text style={[s.actionDesc, { color: colors.text }]}>{action.description}</Text>

                      {/* Validation error */}
                      {validation && !isValid && (
                        <Text style={[s.validationError, { color: colors.danger }]}>
                          {validation.reason}
                        </Text>
                      )}

                      {action.requiresConfirmation && isValid && (
                        <Text style={[s.confirmNote, { color: colors.warning }]}>Requires confirmation</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Warning if any action is invalid */}
              {!allValid && (
                <Text style={[s.blockNote, { color: colors.danger }]}>
                  Fix validation errors before applying.
                </Text>
              )}
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
                style={[s.btn, { backgroundColor: colors.primary, opacity: canApply ? 1 : 0.4 }]}
                onPress={onConfirm}
                disabled={!canApply}
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
    maxHeight: '80%',
  },
  responseText: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  actionsLabel: {
    fontSize: 12, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 10,
  },
  actionsList: { maxHeight: 300 },
  actionRow: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  actionRowHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  actionTypeBadge: {
    alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  actionTypeText: { fontSize: 11, fontWeight: '700' },
  actionDesc: { fontSize: 14, lineHeight: 20 },
  validationError: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  confirmNote: { fontSize: 12, marginTop: 4 },
  blockNote: { fontSize: 13, fontWeight: '500', marginTop: 8, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
});
