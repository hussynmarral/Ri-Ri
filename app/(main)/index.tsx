import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const IS_WEB = Platform.OS === 'web';

import Colors, { Fonts, CATEGORY_COLOR, CATEGORY_TINT } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GlassCard } from '@/components/ui/GlassCard';
import { LiveClock } from '@/components/ui/LiveClock';
import { AICommandBar } from '@/components/ai/AICommandBar';
import { AIActionSheet } from '@/components/ai/AIActionSheet';
import { computeDailySummary, todayDateISO, isUpcoming } from '@/lib/scheduler/engine';
import { processSyncQueue } from '@/lib/sync/syncEngine';
import { getIsOnline } from '@/lib/sync/networkState';
import { useAuthStore } from '@/stores/authStore';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useWaterStore } from '@/stores/waterStore';
import { useHabitStore, HABIT_KEYS } from '@/stores/habitStore';
import { useAIStore } from '@/stores/aiStore';
import { WATER_DAILY_TARGET_ML } from '@/constants/schedule';
import type { AIContext } from '@/lib/ai/client';
import type { ScheduleBlock } from '@/types';
import { ScreenTransition } from '@/components/ui/ScreenTransition';

// ── helpers ────────────────────────────────────────────────────────────────────

function getGreetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning, ';
  if (h < 17) return 'Good afternoon, ';
  if (h < 21) return 'Good evening, ';
  return 'Good night, ';
}

function formatDateParts(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
    rest: d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

function blockTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function useTimeRemaining(targetIso: string) {
  const [secs, setSecs] = useState(() =>
    Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    const id = setInterval(() =>
      setSecs(Math.max(0, Math.floor((new Date(targetIso).getTime() - Date.now()) / 1000))),
    1000);
    return () => clearInterval(id);
  }, [targetIso]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m left`;
  return `${m}m left`;
}

function useBlockProgress(startIso: string, endIso: string) {
  const compute = () => {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    return Math.min(1, Math.max(0, (Date.now() - start) / (end - start)));
  };
  const [pct, setPct] = useState(compute);
  useEffect(() => {
    setPct(compute());
    const id = setInterval(() => setPct(compute()), 3000);
    return () => clearInterval(id);
  }, [startIso, endIso]);
  return pct;
}

function useIsExpired(endIso: string) {
  const [expired, setExpired] = useState(() => new Date(endIso).getTime() <= Date.now());
  useEffect(() => {
    if (expired) return;
    const ms = new Date(endIso).getTime() - Date.now();
    if (ms <= 0) { setExpired(true); return; }
    const t = setTimeout(() => setExpired(true), ms);
    return () => clearTimeout(t);
  }, [endIso]);
  return expired;
}

// ── Countdown digit ────────────────────────────────────────────────────────────

function TickDigit({ value, unit, compact = false }: { value: number; unit: string; compact?: boolean }) {
  const FONT_SZ = compact ? 50 : 68;
  const display = String(value).padStart(2, '0');
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: FONT_SZ, letterSpacing: -3, color: '#FFFFFF', fontFamily: Fonts.display, lineHeight: FONT_SZ + 6 }}>
        {display}
      </Text>
      <Text style={{ fontSize: compact ? 9 : 10, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2, color: '#AEBBD1' }}>
        {unit}
      </Text>
    </View>
  );
}

function TickSep({ compact = false }: { compact?: boolean }) {
  return (
    <Text style={{ fontSize: compact ? 38 : 52, color: '#596B89', marginBottom: compact ? 18 : 22, marginHorizontal: compact ? 2 : 4 }}>
      ·
    </Text>
  );
}

// ── Aurora background orbs ────────────────────────────────────────────────────
// CSS radial-gradient: smooth fade from center to transparent — no hard edges.
// marginTop/Left of -size/2 centers the orb at the given top/left percentage.

function AuroraOrb({ size, opacity, top, left, duration, delay }: { size: number; opacity: number; top: string | number; left: string | number; duration: number; delay: number }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(x, { toValue: 24,  duration,                  useNativeDriver: true }),
        Animated.timing(x, { toValue: -12, duration: duration * 0.75, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0,   duration: duration * 0.55, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(y, { toValue: -18, duration: duration * 1.2, useNativeDriver: true }),
        Animated.timing(y, { toValue: 14,  duration: duration,       useNativeDriver: true }),
        Animated.timing(y, { toValue: 0,   duration: duration * 0.8, useNativeDriver: true }),
      ])).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={[{
        position: 'absolute',
        top, left,
        marginTop: -size / 2,
        marginLeft: -size / 2,
        width: size, height: size,
        borderRadius: size / 2,
        transform: [{ translateX: x }, { translateY: y }],
        // Web: smooth radial gradient fade. Native: very-low-opacity solid circle (barely visible, no hard edge).
        ...(IS_WEB
          ? { backgroundImage: `radial-gradient(circle, rgba(145,164,199,${opacity}) 0%, rgba(145,164,199,${(opacity * 0.4).toFixed(3)}) 35%, rgba(145,164,199,0) 70%)` }
          : { backgroundColor: `rgba(145,164,199,${(opacity * 0.35).toFixed(3)})`, opacity: 0.5 }
        ),
      } as any]}
    />
  );
}

function AuroraOrbs() {
  return (
    <>
      <AuroraOrb size={480} opacity={0.22} top="8%"   left="22%"  duration={9000}  delay={0}    />
      <AuroraOrb size={440} opacity={0.17} top="6%"   left="78%"  duration={11500} delay={1400} />
      <AuroraOrb size={460} opacity={0.20} top="44%"  left="10%"  duration={10000} delay={700}  />
      <AuroraOrb size={420} opacity={0.15} top="50%"  left="70%"  duration={12000} delay={2600} />
      <AuroraOrb size={500} opacity={0.18} top="75%"  left="30%"  duration={9500}  delay={1000} />
      <AuroraOrb size={380} opacity={0.14} top="28%"  left="45%"  duration={13000} delay={3200} />
      <AuroraOrb size={440} opacity={0.16} top="85%"  left="72%"  duration={10800} delay={500}  />
    </>
  );
}

// ── Luminance check — returns true when hex color is dark (for contrast) ──────
function isDarkAccent(hex: string): boolean {
  if (!hex || hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

// ── Overdue Card ───────────────────────────────────────────────────────────────
// Shown when a block's time window has passed but user never marked it Done/Skip.
// Stays visible until the user explicitly acts — never disappears automatically.

function OverdueCard({
  block, colors, onDone, onSkip,
}: {
  block: ScheduleBlock;
  colors: (typeof Colors)['dark'];
  onDone: () => void;
  onSkip: () => void;
}) {
  const accent = CATEGORY_COLOR[block.category] ?? colors.primary;

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(entranceY, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const doneScale   = useRef(new Animated.Value(1)).current;
  const skipScale   = useRef(new Animated.Value(1)).current;
  const pressIn  = (a: Animated.Value) => Animated.spring(a, { toValue: 0.95, speed: 50, useNativeDriver: true }).start();
  const pressOut = (a: Animated.Value) => Animated.spring(a, { toValue: 1,    speed: 20, useNativeDriver: true }).start();

  return (
    <Animated.View style={[oc.outer, { borderColor: `${accent}40`, backgroundColor: colors.surface, opacity: entranceOpacity, transform: [{ translateY: entranceY }] }]}>
      <View style={[oc.accentBar, { backgroundColor: accent }]} />
      <View style={oc.body}>
        <View style={oc.topRow}>
          <View style={[oc.badge, { backgroundColor: 'rgba(89,107,137,0.30)' }]}>
            <Text style={[oc.badgeTxt, { color: '#D9DDE5', fontFamily: Fonts.body }]}>OVERDUE</Text>
          </View>
          <Text style={[oc.timeRange, { color: colors.placeholder }]}>
            {blockTime(block.scheduledStart)} → {blockTime(block.scheduledEnd)}
          </Text>
        </View>
        <Text style={[oc.title, { color: colors.text, fontFamily: Fonts.display }]} numberOfLines={2}>
          {block.title}
        </Text>
        <View style={oc.btnRow}>
          <Animated.View style={[oc.btnWrap, { transform: [{ scale: skipScale }] }]}>
            <Pressable
              onPressIn={() => pressIn(skipScale)}
              onPressOut={() => pressOut(skipScale)}
              onPress={onSkip}
              style={[oc.btn, { borderColor: colors.borderStrong, borderWidth: 1 }]}
            >
              <Text style={[oc.btnTxt, { color: colors.muted, fontFamily: Fonts.body }]}>Skip</Text>
            </Pressable>
          </Animated.View>
          <Animated.View style={[oc.btnWrap, { transform: [{ scale: doneScale }] }]}>
            <Pressable
              onPressIn={() => pressIn(doneScale)}
              onPressOut={() => pressOut(doneScale)}
              onPress={onDone}
              style={[oc.btn, { backgroundColor: accent }]}
            >
              <Text style={[oc.btnTxt, { color: isDarkAccent(accent) ? '#E8F0F8' : '#0D1528', fontFamily: Fonts.bodyBold }]}>Done</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const oc = StyleSheet.create({
  outer:     { flexDirection: 'row', borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  accentBar: { width: 4 },
  body:      { flex: 1, padding: 16, gap: 10 },
  topRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:  { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  timeRange: { fontSize: 12 },
  title:     { fontSize: 22, letterSpacing: -0.6, lineHeight: 26 },
  btnRow:    { flexDirection: 'row', gap: 10 },
  btnWrap:   { flex: 1 },
  btn:       { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnTxt:    { fontSize: 14, letterSpacing: -0.1 },
});

// ── NOW Hero Card ──────────────────────────────────────────────────────────────

function NowHeroCard({
  block,
  colors,
  onDone,
  onMissed,
}: {
  block: ScheduleBlock;
  colors: (typeof Colors)['dark'];
  onDone: () => void;
  onMissed: () => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 640;   // compact countdown on mobile / sidebar layout
  const accent = CATEGORY_COLOR[block.category] ?? colors.primary;
  const progress = useBlockProgress(block.scheduledStart, block.scheduledEnd);
  const isExpired = useIsExpired(block.scheduledEnd);

  // Seconds countdown for animated digits
  const [secs, setSecs] = useState(() =>
    Math.max(0, Math.floor((new Date(block.scheduledEnd).getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    const id = setInterval(() =>
      setSecs(Math.max(0, Math.floor((new Date(block.scheduledEnd).getTime() - Date.now()) / 1000))),
    1000);
    return () => clearInterval(id);
  }, [block.scheduledEnd]);
  const hours = Math.floor(secs / 3600);
  const mins  = Math.floor((secs % 3600) / 60);
  const secsR = secs % 60;

  // Progress bar: on mount, eases in from 0 → current position over 1.2s; then springs on updates
  const progressAnim = useRef(new Animated.Value(0)).current;
  const mountedRef   = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      Animated.timing(progressAnim, { toValue: progress, duration: 1200, useNativeDriver: false }).start();
    } else {
      Animated.spring(progressAnim, { toValue: progress, tension: 30, friction: 20, useNativeDriver: false }).start();
    }
  }, [progress]);
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // Pulsing live dot
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.15, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  // Border + ambient shadow glow
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2200, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 2200, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [`${accent}30`, `${accent}80`],
  });
  const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.55] });
  const shadowRadius  = glow.interpolate({ inputRange: [0, 1], outputRange: [18, 32] });

  // Progress bar shimmer
  const shimmer = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    const run = () => {
      shimmer.setValue(-1);
      Animated.timing(shimmer, { toValue: 2, duration: 1300, useNativeDriver: true }).start(() => {
        setTimeout(run, 900);
      });
    };
    const t = setTimeout(run, 1200);
    return () => clearTimeout(t);
  }, []);
  const shimmerX = shimmer.interpolate({ inputRange: [-1, 2], outputRange: [-50, 160] });

  // Done entrance: scale + opacity spring-in on expiry
  const doneEntrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isExpired) return;
    Animated.spring(doneEntrance, { toValue: 1, tension: 60, friction: 12, useNativeDriver: true }).start();
  }, [isExpired]);

  // Button press
  const missedScale = useRef(new Animated.Value(1)).current;
  const doneScale   = useRef(new Animated.Value(1)).current;
  const pressIn  = (a: Animated.Value) => Animated.spring(a, { toValue: 0.95, speed: 50, useNativeDriver: true }).start();
  const pressOut = (a: Animated.Value) => Animated.spring(a, { toValue: 1,    speed: 20, useNativeDriver: true }).start();

  // 3D tilt on press — uses measured card dimensions for correct centering
  const cardW = useRef(280);
  const cardH = useRef(200);
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const rotX  = tiltX.interpolate({ inputRange: [-5, 5], outputRange: ['-5deg', '5deg'] });
  const rotY  = tiltY.interpolate({ inputRange: [-8, 8], outputRange: ['-8deg', '8deg'] });
  function handleTiltIn(e: any) {
    const { locationX, locationY } = e.nativeEvent;
    const tY = ((locationX - cardW.current / 2) / cardW.current) * 8;
    const tX = -((locationY - cardH.current / 2) / cardH.current) * 5;
    Animated.spring(tiltX, { toValue: tX, tension: 200, friction: 12, useNativeDriver: true }).start();
    Animated.spring(tiltY, { toValue: tY, tension: 200, friction: 12, useNativeDriver: true }).start();
  }
  function resetTilt() {
    Animated.spring(tiltX, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
    Animated.spring(tiltY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }).start();
  }

  // Category halo opacity derived from glow
  const haloOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] });

  return (
    <Pressable
      onPressIn={handleTiltIn}
      onPressOut={resetTilt}
      onLayout={(e) => { cardW.current = e.nativeEvent.layout.width; cardH.current = e.nativeEvent.layout.height; }}
      style={{ marginBottom: 12 }}
    >
      {/* Category ambient halo — soft orb behind the card */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 12, left: 20, right: 20, bottom: 12, borderRadius: 100, backgroundColor: accent, opacity: haloOpacity }} />
      <Animated.View style={[nc.outer, { borderColor, backgroundColor: colors.surface, shadowColor: accent, shadowOpacity, shadowRadius, marginBottom: 0, transform: [{ perspective: 800 }, { rotateX: rotX }, { rotateY: rotY }] }]}>
      {/* Inner top-edge refraction highlight */}
      <View pointerEvents="none" style={nc.innerGlow} />
      {/* Left accent stripe */}
      <View style={[nc.accentBar, { backgroundColor: accent }]} />

      <View style={[nc.body, compact && { padding: 16, gap: 8 }]}>
        {/* NOW badge + time range */}
        <View style={nc.topRow}>
          <View style={nc.badge}>
            <Animated.View style={[nc.liveDot, { backgroundColor: accent, opacity: pulse }]} />
            <Text style={[nc.badgeText, { color: accent, fontFamily: Fonts.body }]}>NOW</Text>
          </View>
          <Text style={[nc.timeRange, { color: '#91A4C7' }]}>
            {blockTime(block.scheduledStart)} → {blockTime(block.scheduledEnd)}
          </Text>
        </View>

        {/* Title */}
        <Text style={[nc.title, { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: compact ? 24 : 30 }]} numberOfLines={2}>
          {block.title}
        </Text>

        {/* Animated countdown digits */}
        {!isExpired ? (
          <View style={nc.digits}>
            {hours > 0 && (
              <>
                <TickDigit value={hours} unit="hr"  compact={compact} />
                <TickSep compact={compact} />
              </>
            )}
            <TickDigit value={mins}  unit="min" compact={compact} />
            <TickSep compact={compact} />
            <TickDigit value={secsR} unit="sec" compact={compact} />
          </View>
        ) : (
          <Text style={[nc.expiredText, { color: accent, fontFamily: Fonts.display, fontSize: compact ? 28 : 36 }]}>Complete</Text>
        )}

        {/* Progress bar with shimmer */}
        <View style={[nc.fillTrack, { backgroundColor: 'rgba(145,164,199,0.22)' }]}>
          <Animated.View style={[nc.fillBar, { width: progressWidth, backgroundColor: accent, overflow: 'hidden' }]}>
            <Animated.View style={[nc.shimmer, { transform: [{ translateX: shimmerX }] }]} />
          </Animated.View>
        </View>

        {/* Buttons */}
        <View style={nc.btnRow}>
          {/* Missed — glass button */}
          <Animated.View style={[nc.btnWrap, { transform: [{ scale: missedScale }] }]}>
            <Pressable
              onPressIn={() => pressIn(missedScale)}
              onPressOut={() => pressOut(missedScale)}
              onPress={onMissed}
              style={[nc.btnGlass, { borderColor: 'rgba(145,164,199,0.40)', backgroundColor: 'rgba(89,107,137,0.14)' }]}
            >
              <Text style={[nc.btnText, { color: '#8BA4C4', fontFamily: Fonts.body }]}>Missed</Text>
            </Pressable>
          </Animated.View>

          {/* Done — springs in only when time is up */}
          <Animated.View
            style={[
              nc.btnWrap,
              { opacity: doneEntrance, transform: [{ scale: doneEntrance }] },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: doneScale }] }}>
              <Pressable
                onPressIn={() => pressIn(doneScale)}
                onPressOut={() => pressOut(doneScale)}
                onPress={onDone}
                disabled={!isExpired}
                style={[nc.btnFilled, { backgroundColor: accent }]}
              >
                <Text style={[nc.btnText, { color: isDarkAccent(accent) ? '#E8F0F8' : '#0D1528', fontFamily: Fonts.bodyBold }]}>Done</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
    </Pressable>
  );
}

const nc = StyleSheet.create({
  outer: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.30,
    shadowRadius: 18,
    elevation: 8,
  },
  innerGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(145,164,199,0.12)', borderBottomColor: 'transparent', borderRightColor: 'transparent', zIndex: 1, pointerEvents: 'none' },
  accentBar:   { width: 3 },
  body:        { flex: 1, padding: 22, gap: 10 },
  topRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot:     { width: 7, height: 7, borderRadius: 4 },
  badgeText:   { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  timeRange:   { fontSize: 12, letterSpacing: 0.1 },
  title:       { fontSize: 30, letterSpacing: -0.8, lineHeight: 34 },
  digits:      { flexDirection: 'row', alignItems: 'flex-end', gap: 0 },
  expiredText: { fontSize: 36, letterSpacing: -1 },
  fillTrack:    { height: 9, borderRadius: 5, overflow: 'hidden' },
  fillBar:      { height: 9, borderRadius: 5 },
  shimmer:      { position: 'absolute', top: 0, bottom: 0, width: 48, backgroundColor: 'rgba(255,255,255,0.32)', transform: [{ skewX: '-20deg' }] },
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnWrap:      { flex: 1 },
  btnGlass: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnFilled: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 15, letterSpacing: -0.1 },
});

// ── Mini upcoming card ─────────────────────────────────────────────────────────

// Clock icon — pure View primitives
function ClockIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 1.5, height: 5, backgroundColor: color, borderRadius: 1, bottom: '50%', marginBottom: -1, alignSelf: 'center' }} />
      <View style={{ position: 'absolute', width: 3.5, height: 1.5, backgroundColor: color, borderRadius: 1, left: '50%', marginLeft: -0.5, alignSelf: 'center' }} />
    </View>
  );
}

// Bookmark icon — pure View primitives
function BookmarkIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 10, height: 14, borderWidth: 1.5, borderColor: color, borderRadius: 2, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color, marginBottom: -1 }} />
    </View>
  );
}

function MiniCard({ block, colors, dim }: { block: ScheduleBlock; colors: (typeof Colors)['dark']; dim?: boolean }) {
  const accent = CATEGORY_COLOR[block.category] ?? colors.primary;
  return (
    <View style={[mc.wrap, { backgroundColor: colors.surface, borderColor: 'rgba(145,164,199,0.50)', opacity: dim ? 0.7 : 1 }]}>
      {/* Inner top-edge refraction */}
      <View pointerEvents="none" style={mc.innerGlow} />
      <View style={[mc.bar, { backgroundColor: accent }]} />
      <View style={mc.iconArea}>
        {dim
          ? <BookmarkIcon color={colors.placeholder} />
          : <ClockIcon color={colors.placeholder} />
        }
      </View>
      <View style={mc.info}>
        <Text style={[mc.label, { color: '#91A4C7', fontFamily: Fonts.body }]}>
          {dim ? 'LATER' : 'UP NEXT'}
        </Text>
        <Text style={[mc.title, { color: dim ? '#AEBBD1' : '#FFFFFF', fontFamily: Fonts.display }]} numberOfLines={1}>
          {block.title}
        </Text>
      </View>
      <Text style={[mc.time, { color: '#91A4C7' }]}>{blockTime(block.scheduledStart)}</Text>
    </View>
  );
}

const mc = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 8, gap: 0, shadowColor: '#000000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  innerGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(145,164,199,0.10)', borderBottomColor: 'transparent', borderRightColor: 'transparent', zIndex: 1, pointerEvents: 'none' },
  bar:      { width: 2, alignSelf: 'stretch' },
  iconArea: { paddingLeft: 14, alignItems: 'center', justifyContent: 'center' },
  info:     { flex: 1, paddingVertical: 14, paddingHorizontal: 12, gap: 2 },
  label:    { fontSize: 8.5, letterSpacing: 1.6, textTransform: 'uppercase' },
  title:    { fontSize: 15, letterSpacing: -0.2 },
  time:     { fontSize: 13, paddingRight: 18 },
});

// ── Stat cell ──────────────────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={sc.cell}>
      <Text style={[sc.val, { color, fontFamily: Fonts.display }]}>{value}</Text>
      <Text style={[sc.lbl, { color: '#7A90A8', fontFamily: Fonts.body }]}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  cell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  val:  { fontSize: 26, letterSpacing: -0.8 },
  lbl:  { fontSize: 10, marginTop: 3, letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ── Greeting with letter-spacing entrance on "RiRi" ──────────────────────────

function GreetingLine({ prefix, compact = false }: { prefix: string; compact?: boolean }) {
  const lsAnim = useRef(new Animated.Value(10)).current;
  const opAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opAnim, { toValue: 1, duration: 500, delay: 60, useNativeDriver: true }),
      Animated.spring(lsAnim, { toValue: -0.5, tension: 48, friction: 14, useNativeDriver: false }),
    ]).start();
  }, []);
  const sz = compact ? 22 : 30;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: compact ? 12 : 20, alignItems: 'baseline' }}>
      <Animated.Text style={{ fontSize: sz, color: '#FFFFFF', fontFamily: Fonts.display, letterSpacing: -0.8, opacity: opAnim }}>
        {prefix}
      </Animated.Text>
      <Animated.Text style={{ fontSize: sz, color: '#AEBBD1', fontFamily: Fonts.display, letterSpacing: lsAnim }}>
        {'RiRi'}
      </Animated.Text>
      <Animated.Text style={{ fontSize: sz, color: '#91A4C7', fontFamily: Fonts.display, letterSpacing: -0.8, opacity: opAnim }}>
        {' ♥'}
      </Animated.Text>
    </View>
  );
}

// ── Animated section wrapper ───────────────────────────────────────────────────

function FadeSlide({
  children,
  delay = 0,
}: { children: ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        tension: 80,
        friction: 14,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const user   = useAuthStore((s) => s.user);

  const {
    todayBlocks, currentBlock, nextBlock,
    load, completeBlock, skipBlock, refreshCurrent,
  } = useScheduleStore();

  const { todayTotalMl } = useWaterStore();
  const { todayHabits }  = useHabitStore();
  const {
    isLoading: aiLoading, pendingActions, actionValidations, aiResponse, error: aiError,
    sendCommand, confirmActions, dismissActions,
  } = useAIStore();

  const [refreshing, setRefreshing] = useState(false);
  const date = todayDateISO();
  const { weekday, rest } = formatDateParts(date);
  const summary = computeDailySummary(todayBlocks);

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id, date]);

  useEffect(() => {
    const id = setInterval(refreshCurrent, 15_000);
    return () => clearInterval(id);
  }, [refreshCurrent]);

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      if (getIsOnline()) await processSyncQueue().catch(() => {});
      await Promise.all([
        load(user.id, date),
        useWaterStore.getState().load(user.id, date),
        useHabitStore.getState().load(user.id, date),
      ]);
    } finally { setRefreshing(false); }
  }, [user?.id, date]);

  // Overdue = time window passed but user never marked Done or Skip
  const overdueBlocks = todayBlocks.filter((b) =>
    new Date(b.scheduledEnd).getTime() < Date.now() &&
    b.status !== 'completed' &&
    b.status !== 'skipped' &&
    b.id !== currentBlock?.id,
  );

  // 1-2 truly upcoming blocks (start time still in future, not past-pending)
  const secondUpcoming = todayBlocks.find(
    (b) => isUpcoming(b) && b.id !== currentBlock?.id && b.id !== nextBlock?.id,
  );

  const completedHabits = HABIT_KEYS.filter((k) => todayHabits[k]?.completed).length;

  function buildAIContext(): AIContext {
    return {
      date,
      blocks: todayBlocks.map((b) => ({
        id: b.id, title: b.title, category: b.category,
        scheduledStart: b.scheduledStart, scheduledEnd: b.scheduledEnd, status: b.status,
      })),
      waterMl: todayTotalMl,
      habitsCompleted: HABIT_KEYS.filter((k) => todayHabits[k]?.completed),
    };
  }

  const showAISheet = pendingActions.length > 0 || (!!aiResponse && !aiLoading);

  return (
    <ScreenTransition>
    <View style={s.root}>
      <AuroraOrbs />
      <ScrollView
        contentContainerStyle={[s.scroll, isMobile && { paddingHorizontal: 14, paddingTop: 36 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Hero — greeting centred top, clock left ──────────────── */}
        <FadeSlide delay={0}>
          {/* Greeting — animated letter-spacing entrance on RiRi */}
          <GreetingLine prefix={getGreetingPrefix()} compact={isMobile} />

          {/* Clock row */}
          <View style={[s.hero, isMobile && { marginBottom: 14 }]}>
            <Text style={[s.weekday, { color: '#91A4C7', fontFamily: Fonts.body, fontSize: isMobile ? 10 : 12 }]}>
              {weekday}
            </Text>
            <LiveClock large={!isMobile} medium={isMobile} showSeconds={!isMobile} />
            <Text style={[s.dateRest, { color: '#AEBBD1', fontFamily: Fonts.body, fontSize: isMobile ? 14 : 17 }]}>{rest}</Text>
          </View>
        </FadeSlide>

        {/* ── Overdue blocks (missed without marking Done) ──────────── */}
        {overdueBlocks.map((block) => (
          <OverdueCard
            key={block.id}
            block={block}
            colors={colors}
            onDone={() => completeBlock(block.id)}
            onSkip={() => skipBlock(block.id)}
          />
        ))}

        {/* ── NOW hero card ─────────────────────────────────────────── */}
        {currentBlock && (
          <FadeSlide delay={120}>
            <NowHeroCard
              block={currentBlock}
              colors={colors}
              onDone={() => completeBlock(currentBlock.id)}
              onMissed={() => skipBlock(currentBlock.id)}
            />
          </FadeSlide>
        )}

        {/* ── Upcoming mini cards (1–2) ─────────────────────────────── */}
        {nextBlock && (
          <FadeSlide delay={200}>
            <MiniCard block={nextBlock} colors={colors} />
          </FadeSlide>
        )}
        {secondUpcoming && (
          <FadeSlide delay={260}>
            <MiniCard block={secondUpcoming} colors={colors} dim />
          </FadeSlide>
        )}

        {/* ── Progress widgets ──────────────────────────────────────── */}
        <FadeSlide delay={340}>
          {isMobile ? (
            <View style={{ gap: 8 }}>
              <View style={s.widgetsRow}>
                <WidgetCard kind="water"  label="Water"  value={`${(todayTotalMl / 1000).toFixed(1)}L`}      sub={`/ ${(WATER_DAILY_TARGET_ML / 1000).toFixed(1)}L`} pct={todayTotalMl / WATER_DAILY_TARGET_ML}  color={colors.primary} colors={colors} compact />
                <WidgetCard kind="habits" label="Habits" value={`${completedHabits}/${HABIT_KEYS.length}`}   sub="Today"                                                pct={completedHabits / HABIT_KEYS.length}  color={colors.success} colors={colors} completedHabits={completedHabits} totalHabits={HABIT_KEYS.length} compact />
              </View>
              <View style={s.widgetsRow}>
                <WidgetCard kind="score"  label="Score"  value={`${summary.disciplineScore}`}                sub="Points"                                               pct={summary.disciplineScore / 100}        color={colors.primary} colors={colors} compact />
                <View style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <View style={s.widgetsRow}>
              <WidgetCard kind="water"  label="Water"  value={`${(todayTotalMl / 1000).toFixed(1)}L`}     sub={`/ ${(WATER_DAILY_TARGET_ML / 1000).toFixed(1)}L`}  pct={todayTotalMl / WATER_DAILY_TARGET_ML}   color={colors.primary} colors={colors} />
              <WidgetCard kind="habits" label="Habits" value={`${completedHabits} / ${HABIT_KEYS.length}`} sub="Completed"                                                  pct={completedHabits / HABIT_KEYS.length}   color={colors.success} colors={colors} completedHabits={completedHabits} totalHabits={HABIT_KEYS.length} />
              <WidgetCard kind="score"  label="Score"  value={`${summary.disciplineScore}`}                sub="Points"                                                     pct={summary.disciplineScore / 100}         color={colors.primary} colors={colors} />
            </View>
          )}
        </FadeSlide>


        {/* ── Day stats ────────────────────────────────────────────── */}
        {todayBlocks.length > 0 && (
          <FadeSlide delay={460}>
            <View style={[s.statsRow, { backgroundColor: colors.surface, borderColor: 'rgba(145,164,199,0.50)' }]}>
              <StatCell label="Done"    value={`${summary.totalCompleted}/${summary.totalScheduled}`} color={colors.success} />
              <View style={[s.statDiv, { backgroundColor: colors.border }]} />
              <StatCell label="Skipped" value={String(summary.totalSkipped)} color={colors.danger} />
              <View style={[s.statDiv, { backgroundColor: colors.border }]} />
              <StatCell label="Avg Late" value={summary.avgLatenessMinutes > 0 ? `${summary.avgLatenessMinutes}m` : '—'} color={colors.warning} />
            </View>
          </FadeSlide>
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      <AICommandBar
        onSend={(msg) => user && sendCommand(msg, buildAIContext(), user.id)}
        isLoading={aiLoading}
      />

      <AIActionSheet
        visible={showAISheet}
        aiResponse={aiError ?? aiResponse}
        actions={pendingActions}
        actionValidations={actionValidations}
        isLoading={aiLoading}
        onConfirm={() => { if (!user) return; confirmActions(user.id, () => load(user.id, date)); }}
        onDismiss={dismissActions}
      />
    </View>
    </ScreenTransition>
  );
}

// ── Widget card icons — pure View primitives ───────────────────────────────────

function WaterIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 18, height: 22, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, borderWidth: 2, borderColor: color }} />
  );
}
function HabitsIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 6, height: 10, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: color, transform: [{ rotate: '-45deg' }], marginTop: -4 }} />
    </View>
  );
}
function ScoreIcon({ color }: { color: string }) {
  const th = 2;
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: th, backgroundColor: color, borderRadius: 1, position: 'absolute' }} />
      <View style={{ width: th, height: 14, backgroundColor: color, borderRadius: 1, position: 'absolute' }} />
      <View style={{ width: 8, height: th, backgroundColor: color, borderRadius: 1, position: 'absolute', transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: 8, height: th, backgroundColor: color, borderRadius: 1, position: 'absolute', transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

// ── Widget card ────────────────────────────────────────────────────────────────

type WidgetKind = 'water' | 'habits' | 'score';

function HabitDots({ completed, total, color }: { completed: number; total: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: i < completed ? color : 'transparent',
          borderWidth: 1.5,
          borderColor: i < completed ? color : 'rgba(145,164,199,0.35)',
        }} />
      ))}
    </View>
  );
}

function WidgetCard({
  label, value, sub, pct, color, colors, kind, completedHabits, totalHabits, compact = false,
}: { label: string; value: string; sub: string; pct: number; color: string; colors: (typeof Colors)['dark']; kind: WidgetKind; completedHabits?: number; totalHabits?: number; compact?: boolean }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fillAnim, { toValue: Math.min(1, pct), tension: 50, friction: 18, useNativeDriver: false }).start();
  }, [pct]);
  const fillWidth = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={[wc.wrap, { backgroundColor: colors.surface, borderColor: 'rgba(145,164,199,0.55)', padding: compact ? 11 : 14 }]}>
      {/* Inner refraction highlight */}
      <View pointerEvents="none" style={wc.innerGlow} />
      {/* Icon box */}
      <View style={[wc.iconBox, { backgroundColor: 'rgba(145,164,199,0.18)', borderColor: 'rgba(145,164,199,0.35)', width: compact ? 30 : 36, height: compact ? 30 : 36 }]}>
        {kind === 'water'  && <WaterIcon  color={color} />}
        {kind === 'habits' && <HabitsIcon color={color} />}
        {kind === 'score'  && <ScoreIcon  color={color} />}
      </View>
      <Text style={[wc.label, { color: '#91A4C7', fontFamily: Fonts.body, fontSize: compact ? 9 : 10 }]}>{label}</Text>
      <Text style={[wc.value, { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: compact ? 20 : 24 }]}>{value}</Text>
      <Text style={[wc.sub,   { color: '#AEBBD1', fontFamily: Fonts.body }]}>{sub}</Text>
      {kind === 'habits' && completedHabits !== undefined && totalHabits !== undefined ? (
        <HabitDots completed={completedHabits} total={totalHabits} color={color} />
      ) : (
        <View style={wc.track}>
          <Animated.View style={[wc.fill, { width: fillWidth, backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

const wc = StyleSheet.create({
  wrap:     { flex: 1, padding: 14, gap: 5, borderRadius: 20, borderWidth: 1, shadowColor: '#000000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 5 },
  innerGlow:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(145,164,199,0.10)', borderBottomColor: 'transparent', borderRightColor: 'transparent', zIndex: 1, pointerEvents: 'none' },
  iconBox:  { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  label:    { fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  value:    { fontSize: 24, letterSpacing: -0.8 },
  sub:      { fontSize: 11, letterSpacing: 0.1, marginTop: -2 },
  track:    { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(145,164,199,0.20)', marginTop: 2 },
  fill:     { height: 4, borderRadius: 2 },
});

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 20 },

  hero:     { marginBottom: 24 },
  greeting: { fontSize: 30, letterSpacing: -0.8, textAlign: 'center', marginBottom: 20 },
  weekday:  { fontSize: 12, letterSpacing: 2.5, marginBottom: 8 },
  dateRest: { fontSize: 17, marginTop: 10, letterSpacing: 0.2 },

  widgetsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  statsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  statDiv: { width: StyleSheet.hairlineWidth },
});
