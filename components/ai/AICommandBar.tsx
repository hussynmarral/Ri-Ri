import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export function AICommandBar({ onSend, isLoading }: Props) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const [text, setText] = useState('');

  function submit() {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText('');
  }

  return (
    <View style={[s.bar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <TextInput
        style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
        placeholder="Ask AI anything about your schedule…"
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={setText}
        returnKeyType="send"
        onSubmitEditing={submit}
        editable={!isLoading}
        multiline={false}
      />
      <TouchableOpacity
        style={[s.btn, { backgroundColor: colors.primary, opacity: (!text.trim() || isLoading) ? 0.5 : 1 }]}
        onPress={submit}
        disabled={!text.trim() || isLoading}
      >
        {isLoading
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={s.btnText}>↑</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -1 },
});
