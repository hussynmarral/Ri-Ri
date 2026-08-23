import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const IS_WEB = Platform.OS === 'web';
import { BlurView } from 'expo-blur';

import Colors, { Fonts } from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';

const ICE   = '#91A4C7';
const ICE2  = '#AEBBD1';
const DARK  = '#060810';

// Reuse the same radial-glow orb from the dashboard
function AuthOrb({ size, opacity, top, left, duration, delay }: {
  size: number; opacity: number;
  top: number | string; left: number | string;
  duration: number; delay: number;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(x, { toValue: 18,  duration,            useNativeDriver: true }),
        Animated.timing(x, { toValue: -10, duration: duration * 0.75, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0,   duration: duration * 0.55, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(y, { toValue: -14, duration: duration * 1.2, useNativeDriver: true }),
        Animated.timing(y, { toValue: 10,  duration: duration,       useNativeDriver: true }),
        Animated.timing(y, { toValue: 0,   duration: duration * 0.8, useNativeDriver: true }),
      ])).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute', top, left,
        marginTop: -size / 2, marginLeft: -size / 2,
        width: size, height: size,
        borderRadius: size / 2,
        transform: [{ translateX: x }, { translateY: y }],
        ...(IS_WEB
          ? { backgroundImage: `radial-gradient(circle, rgba(145,164,199,${opacity}) 0%, rgba(145,164,199,${(opacity * 0.4).toFixed(3)}) 35%, rgba(145,164,199,0) 70%)` }
          : { backgroundColor: `rgba(145,164,199,${(opacity * 0.35).toFixed(3)})`, opacity: 0.5 }
        ),
      } as any]}
    />
  );
}

export default function AuthScreen() {
  const colors = Colors.dark;
  const [mode, setMode]     = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState('');
  const [success, setOk]    = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  const { signInWithEmail, signUpWithEmail } = useAuthStore();

  // Entrance animation
  const cardY   = useRef(new Animated.Value(32)).current;
  const cardOp  = useRef(new Animated.Value(0)).current;
  const logoY   = useRef(new Animated.Value(-20)).current;
  const logoOp  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOp,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(logoY,   { toValue: 0, useNativeDriver: true, speed: 8, bounciness: 3 }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOp,  { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(cardY,   { toValue: 0, useNativeDriver: true, speed: 9, bounciness: 4 }),
      ]).start();
    }, 220);
  }, []);

  // Wordmark shimmer loop
  const shimmer = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const run = () => {
      shimmer.setValue(-1);
      Animated.timing(shimmer, { toValue: 2, duration: 2200, useNativeDriver: true }).start(() => {
        setTimeout(run, 2600);
      });
    };
    const t = setTimeout(run, 800);
    return () => clearTimeout(t);
  }, []);
  const shimX = shimmer.interpolate({ inputRange: [-1, 2], outputRange: [-80, 260] });

  // Pulsing ring around submit button
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 2000, useNativeDriver: false }),
      Animated.timing(ring, { toValue: 0, duration: 2000, useNativeDriver: false }),
    ])).start();
  }, []);
  const ringBorder = ring.interpolate({ inputRange: [0, 1], outputRange: ['rgba(145,164,199,0.30)', 'rgba(145,164,199,0.70)'] });

  async function submit() {
    setError(''); setOk('');
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoad(true);
    try {
      if (mode === 'signin') {
        const { error: e } = await signInWithEmail(email.trim(), password);
        if (e) setError(e);
      } else {
        const { error: e } = await signUpWithEmail(email.trim(), password, '');
        if (e) { setError(e); } else {
          setOk('Account created. Check your email to confirm, then sign in.');
          setMode('signin');
        }
      }
    } finally { setLoad(false); }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Aurora background */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <AuthOrb size={420} opacity={0.22} top="12%"  left="22%"  duration={9000}  delay={0}    />
        <AuthOrb size={380} opacity={0.17} top="8%"   left="75%"  duration={11500} delay={1200} />
        <AuthOrb size={400} opacity={0.19} top="60%"  left="5%"   duration={10200} delay={600}  />
        <AuthOrb size={360} opacity={0.15} top="70%"  left="60%"  duration={12000} delay={2400} />
        <AuthOrb size={340} opacity={0.18} top="40%"  left="42%"  duration={9800}  delay={900}  />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <Animated.View style={[s.wordmark, { opacity: logoOp, transform: [{ translateY: logoY }] }]}>
          <View style={s.wordmarkRow}>
            <View style={{ overflow: 'hidden', position: 'relative' }}>
              <Text style={[s.appName, { fontFamily: Fonts.display }]}>
                <Text style={{ color: ICE }}>Ri</Text>
                <Text style={{ color: '#C8D5E8' }}> Ri</Text>
              </Text>
              {/* Shimmer sweep */}
              <Animated.View
                pointerEvents="none"
                style={[s.shimmer, { transform: [{ translateX: shimX }, { skewX: '-15deg' }] }]}
              />
            </View>
            <View style={[s.nameDot, { backgroundColor: ICE }]} />
          </View>
          <Text style={[s.tagline, { color: '#5A6E8A', fontFamily: Fonts.body }]}>
            Your personal operating system
          </Text>
        </Animated.View>

        {/* Glass card */}
        <Animated.View style={[{ opacity: cardOp, transform: [{ translateY: cardY }] }]}>
          <BlurView intensity={40} tint="dark" style={[s.card, { overflow: 'hidden', borderRadius: 28 }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,12,22,0.72)', borderRadius: 28 }]} />
            <View style={[s.cardTopEdge]} />
            <View style={s.cardInner}>

              <Text style={[s.formLabel, { color: '#4A5E7A', fontFamily: Fonts.body }]}>
                {mode === 'signin' ? 'SIGN IN TO CONTINUE' : 'CREATE YOUR ACCOUNT'}
              </Text>

              <View style={s.fieldGroup}>
                <View style={[s.inputWrap, focused === 'email' && s.inputWrapFocused]}>
                  <TextInput
                    style={[s.input, { color: '#D4E3F5', fontFamily: Fonts.body }]}
                    placeholder="Email address"
                    placeholderTextColor="#3A4E68"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="next"
                    keyboardAppearance="dark"
                  />
                </View>
                <View style={[s.inputWrap, focused === 'pass' && s.inputWrapFocused]}>
                  <TextInput
                    style={[s.input, { color: '#D4E3F5', fontFamily: Fonts.body }]}
                    placeholder="Password"
                    placeholderTextColor="#3A4E68"
                    value={password}
                    onChangeText={setPass}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    keyboardAppearance="dark"
                  />
                </View>
              </View>

              {error   ? <Text style={[s.errorText,   { color: '#E07070', fontFamily: Fonts.body }]}>{error}</Text>   : null}
              {success ? <Text style={[s.successText, { color: '#7AC4A0', fontFamily: Fonts.body }]}>{success}</Text> : null}

              {/* Primary CTA */}
              <Animated.View style={[s.btnOuter, { borderColor: ringBorder }]}>
                <Pressable
                  onPress={submit}
                  disabled={loading}
                  style={({ pressed }) => [s.btn, { opacity: loading ? 0.55 : pressed ? 0.82 : 1 }]}
                >
                  <Text style={[s.btnText, { fontFamily: Fonts.bodyBold }]}>
                    {loading ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Text>
                </Pressable>
              </Animated.View>

              <Pressable
                onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setOk(''); }}
                style={({ pressed }) => [s.switchBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[s.switchText, { color: '#3D546E', fontFamily: Fonts.body }]}>
                  {mode === 'signin' ? 'No account? ' : 'Have an account? '}
                  <Text style={{ color: ICE2 }}>
                    {mode === 'signin' ? 'Create one' : 'Sign in'}
                  </Text>
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: DARK },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 60 },

  wordmark:    { marginBottom: 40 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  appName:     { fontSize: 76, letterSpacing: -4, lineHeight: 80 },
  nameDot:     { width: 11, height: 11, borderRadius: 6, marginLeft: 6, marginBottom: 14 },
  shimmer:     { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255,255,255,0.14)' },
  tagline:     { fontSize: 15, letterSpacing: 0.2 },

  card:        { borderWidth: 1, borderColor: 'rgba(145,164,199,0.14)' },
  cardTopEdge: { position: 'absolute', top: 0, left: 1, right: 1, height: 1, backgroundColor: 'rgba(174,187,209,0.22)', zIndex: 2 },
  cardInner:   { padding: 28, gap: 0 },

  formLabel:   { fontSize: 10, letterSpacing: 1.4, marginBottom: 20 },
  fieldGroup:  { gap: 10, marginBottom: 14 },

  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(145,164,199,0.16)',
    backgroundColor: 'rgba(145,164,199,0.06)',
    overflow: 'hidden',
  },
  inputWrapFocused: {
    borderColor: 'rgba(145,164,199,0.48)',
    backgroundColor: 'rgba(145,164,199,0.10)',
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
  },

  errorText:   { fontSize: 13, marginBottom: 10, lineHeight: 18 },
  successText: { fontSize: 13, marginBottom: 10, lineHeight: 18 },

  btnOuter: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
  },
  btn: {
    borderRadius: 15,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: ICE,
  },
  btnText: {
    fontSize: 16,
    letterSpacing: -0.2,
    color: '#0A1628',
  },

  switchBtn:  { alignItems: 'center', paddingVertical: 24 },
  switchText: { fontSize: 14 },
});
