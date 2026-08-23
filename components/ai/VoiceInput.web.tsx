// Web Speech API voice input — Chrome/Edge/Safari (iOS 14.5+)
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  onResult: (transcript: string) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceInput({ onResult, disabled }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported]     = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (e: any) => {
      const text: string = e.results?.[0]?.[0]?.transcript ?? '';
      if (text) onResult(text);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend   = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      try { recognition.abort(); } catch {}
    };
  }, []);

  const toggle = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  }, [isListening]);

  if (!supported) return null;

  const active = isListening ? colors.primary : colors.textSecondary;
  const size   = 28;
  const s2     = size / 28;

  return (
    <Pressable
      onPress={toggle}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}
    >
      {/* Pulsing ring when active */}
      {isListening && (
        <View style={{
          position: 'absolute', inset: -10, borderRadius: 999,
          borderWidth: 2, borderColor: colors.primary, opacity: 0.35,
        }} />
      )}
      <MicGlyph color={active} size={size} s2={s2} />
    </Pressable>
  );
}

function MicGlyph({ color, size, s2 }: { color: string; size: number; s2: number }) {
  return (
    <View style={{ width: size, height: Math.round(size * 1.3), alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: Math.round(14 * s2), height: Math.round(20 * s2),
        borderRadius: Math.round(7 * s2), borderWidth: 2, borderColor: color,
        position: 'absolute', top: 0,
      }} />
      <View style={{
        width: 2, height: Math.round(9 * s2), borderRadius: 1,
        backgroundColor: color, position: 'absolute', bottom: 0,
      }} />
      <View style={{
        width: Math.round(20 * s2), height: Math.round(11 * s2),
        borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderTopWidth: 0,
        borderBottomLeftRadius: Math.round(11 * s2), borderBottomRightRadius: Math.round(11 * s2),
        borderColor: color, position: 'absolute', bottom: Math.round(8 * s2),
      }} />
    </View>
  );
}
