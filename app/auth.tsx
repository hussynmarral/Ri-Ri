import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { signInWithEmail, signUpWithEmail } = useAuthStore();
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  async function submit() {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email.trim(), password);
        if (error) Alert.alert('Sign in failed', error);
      } else {
        const { error } = await signUpWithEmail(email.trim(), password, '');
        if (error) {
          Alert.alert('Sign up failed', error);
        } else {
          Alert.alert('Check your email', 'Confirm your email then sign in.');
          setMode('signin');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={[s.appName, { color: colors.primary }]}>Ri Ri</Text>
          <Text style={[s.tagline, { color: colors.muted }]}>Your personal operating system</Text>
        </View>

        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Text>

          <TextInput
            style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={[s.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.primary, opacity: loading ? 0.65 : 1 }]}
            onPress={submit}
            disabled={loading}
          >
            <Text style={s.btnText}>
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.switchBtn}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            <Text style={[s.switchText, { color: colors.muted }]}>
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 44 },
  appName: { fontSize: 48, fontWeight: '800', letterSpacing: -2 },
  tagline: { fontSize: 15, marginTop: 6 },
  card: { borderRadius: 20, borderWidth: 1, padding: 24 },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { marginTop: 18, alignItems: 'center' },
  switchText: { fontSize: 14 },
});
