import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRef } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { AIAction } from '@/types';
import type { ValidationResult } from '@/lib/ai/validator';

const ACTION_LABELS: Record<string, string> = {
  add_event:       'Add event',
  move_task:       'Move block',
  change_schedule: 'Change schedule',
  change_recurring:'Edit recurring',
  delete_recurring:'Remove recurring',
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
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const allValid = actionValidations.length === 0 || actionValidations.every((v) => v.valid);
  const canApply = actions.length > 0 && allValid && !isLoading;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={s.overlay} onPress={onDismiss}>
        <Pressable
          style={[s.sheet, { backgroundColor: colors.elevated, borderColor: colors.borderStrong }]}
          onPress={() => {}}
        >
          {/* Drag handle */}
          <View style={[s.handle, { backgroundColor: colors.placeholder }]} />

          {/* AI response text */}
          {!!aiResponse && (
            <Text style={[s.responseText, { color: colors.text }]}>{aiResponse}</Text>
          )}

          {/* Proposed actions */}
          {actions.length > 0 && (
            <>
              <Text style={[s.sectionLabel, { color: colors.placeholder }]}>Proposed changes</Text>
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
                          backgroundColor: colors.surface,
                          borderColor: isValid ? colors.border : colors.danger + '66',
                        },
                      ]}
                    >
                      <View style={s.actionRowTop}>
                        <View
                          style={[
                            s.typeBadge,
                            { backgroundColor: isValid ? colors.accentTint : colors.dangerTint },
                          ]}
                        >
                          <Text
                            style={[
                              s.typeText,
                              { color: isValid ? colors.primary : colors.danger },
                            ]}
                          >
                            {ACTION_LABELS[action.type] ?? action.type}
                          </Text>
                        </View>

                        {/* Valid/invalid indicator — View primitives, no emoji */}
                        {validation && (
                          <View
                            style={[
                              s.statusDot,
                              { backgroundColor: isValid ? colors.success : colors.danger },
                            ]}
                          />
                        )}
                      </View>

                      <Text style={[s.actionDesc, { color: colors.textSecondary }]}>{action.description}</Text>

                      {validation && !isValid && (
                        <Text style={[s.validationError, { color: colors.danger }]}>{validation.reason}</Text>
                      )}
                      {action.requiresConfirmation && isValid && (
                        <Text style={[s.confirmNote, { color: colors.warning }]}>Requires confirmation</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {!allValid && (
                <Text style={[s.blockNote, { color: colors.danger }]}>
                  Fix validation errors before applying.
                </Text>
              )}
            </>
          )}

          {/* Buttons */}
          <View style={s.btnRow}>
            <SheetBtn label="Cancel" outline colors={colors} onPress={onDismiss} />
            {actions.length > 0 && (
              <SheetBtn
                label={isLoading ? 'Applying…' : 'Apply'}
                primary
                colors={colors}
                disabled={!canApply}
                onPress={onConfirm}
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetBtn({
  label,
  primary,
  outline,
  disabled,
  colors,
  onPress,
}: {
  label: string;
  primary?: boolean;
  outline?: boolean;
  disabled?: boolean;
  colors: (typeof Colors)['dark'];
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          s.btn,
          primary && { backgroundColor: colors.primary },
          outline && { borderWidth: 1, borderColor: colors.borderStrong },
          disabled && { opacity: 0.35 },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[s.btnText, { color: primary ? '#AEBBD1' : colors.muted }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingTop: 14,
    paddingBottom: 40,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },

  responseText: {
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: -0.1,
    fontWeight: '400',
    marginBottom: 20,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  actionsList: { maxHeight: 280, marginBottom: 4 },
  actionRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  actionRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeText:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  statusDot:    { width: 8, height: 8, borderRadius: 4 },
  actionDesc:   { fontSize: 14, lineHeight: 21, letterSpacing: 0 },
  validationError: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  confirmNote:  { fontSize: 12, marginTop: 4 },
  blockNote:    { fontSize: 13, fontWeight: '500', marginTop: 4, marginBottom: 8, textAlign: 'center' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn:    { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
});
