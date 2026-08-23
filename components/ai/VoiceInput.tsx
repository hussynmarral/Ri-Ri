// Voice input component — requires @react-native-voice/voice
// Run `npx expo prebuild` then `npx expo run:ios` / `run:android` to activate.
// On web this renders nothing (voice not supported in browser via this library).
import { Platform, Pressable, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  onResult: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onResult, disabled }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const voiceRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let Voice: any;
    try {
      Voice = require('@react-native-voice/voice').default;
    } catch {
      return; // library not installed / prebuild not run
    }

    voiceRef.current = Voice;

    Voice.onSpeechResults = (e: any) => {
      const text: string = e.value?.[0] ?? '';
      if (text) onResult(text);
      setIsListening(false);
    };
    Voice.onSpeechError = (e: any) => {
      setError(e.error?.message ?? 'Voice error');
      setIsListening(false);
    };
    Voice.onSpeechEnd = () => setIsListening(false);

    return () => {
      Voice.destroy().catch(() => {});
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!voiceRef.current) return;
    setError('');
    if (isListening) {
      await voiceRef.current.stop().catch(() => {});
      setIsListening(false);
    } else {
      try {
        await voiceRef.current.start('en-US');
        setIsListening(true);
      } catch (e: any) {
        setError(e.message ?? 'Could not start voice');
      }
    }
  }, [isListening]);

  if (Platform.OS === 'web') return null;

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}
    >
      <MicGlyph color={isListening ? colors.primary : colors.textSecondary} size={28} />
    </Pressable>
  );
}

function MicGlyph({ color, size }: { color: string; size: number }) {
  const s2 = size / 28;
  return (
    <View style={{ width: size, height: Math.round(size * 1.3), alignItems: 'center', justifyContent: 'center' }}>
      {/* Capsule body */}
      <View style={{
        width: Math.round(14 * s2),
        height: Math.round(20 * s2),
        borderRadius: Math.round(7 * s2),
        borderWidth: 2,
        borderColor: color,
        position: 'absolute',
        top: 0,
      }} />
      {/* Stand */}
      <View style={{
        width: 2,
        height: Math.round(9 * s2),
        borderRadius: 1,
        backgroundColor: color,
        position: 'absolute',
        bottom: 0,
      }} />
      {/* Arc base */}
      <View style={{
        width: Math.round(20 * s2),
        height: Math.round(11 * s2),
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderTopWidth: 0,
        borderBottomLeftRadius: Math.round(11 * s2),
        borderBottomRightRadius: Math.round(11 * s2),
        borderColor: color,
        position: 'absolute',
        bottom: Math.round(8 * s2),
      }} />
    </View>
  );
}

