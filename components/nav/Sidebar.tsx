import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import { Fonts } from '@/constants/Colors';

// ── Sidebar palette — dark neutral glass, white text, ice-blue accent only ────
const SB = {
  bg:               'rgba(10,14,26,0.95)',
  border:           'rgba(174,187,209,0.22)',
  topEdge:          'rgba(174,187,209,0.38)',

  active:           '#FFFFFF',
  inactive:         'rgba(255,255,255,0.72)',

  activeGlowBg:     'rgba(145,164,199,0.18)',
  activeGlowBorder: 'rgba(174,187,209,0.50)',
  activeGlowShadow: '#91A4C7',

  brand:            '#FFFFFF',
};

// ── Icon helpers — always white, opacity differs for active/inactive ───────────

function IconToday({ active }: { active: boolean }) {
  const c = active ? SB.active : SB.inactive;
  const th = active ? 1.8 : 1.5;
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 14, height: th, backgroundColor: c, borderRadius: 1, marginBottom: 3 }} />
      <View style={{ width: 12, height: 10, borderRadius: 3, borderWidth: th, borderColor: c, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
        <View style={{ width: 3, height: 5, borderRadius: 1, backgroundColor: c, opacity: active ? 1 : 0.7 }} />
      </View>
    </View>
  );
}

function IconSchedule({ active }: { active: boolean }) {
  const c = active ? SB.active : SB.inactive;
  const rows = [14, 10, 12];
  return (
    <View style={{ width: 20, height: 20, alignItems: 'flex-start', justifyContent: 'center', gap: 4 }}>
      {rows.map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: active ? 4 : 3, height: active ? 4 : 3, borderRadius: 2, backgroundColor: c }} />
          <View style={{ width: w, height: active ? 1.8 : 1.5, backgroundColor: c, borderRadius: 1 }} />
        </View>
      ))}
    </View>
  );
}

function IconAI({ active }: { active: boolean }) {
  const c = active ? SB.active : SB.inactive;
  const th = active ? 1.8 : 1.5;
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: th, backgroundColor: c, borderRadius: 1, position: 'absolute' }} />
      <View style={{ width: th, height: 16, backgroundColor: c, borderRadius: 1, position: 'absolute' }} />
      <View style={{ width: 9, height: th, backgroundColor: c, borderRadius: 1, position: 'absolute', transform: [{ rotate: '45deg' }] }} />
      <View style={{ width: 9, height: th, backgroundColor: c, borderRadius: 1, position: 'absolute', transform: [{ rotate: '-45deg' }] }} />
    </View>
  );
}

// Water droplet icon
function IconWater({ active }: { active: boolean }) {
  const c = active ? SB.active : SB.inactive;
  const th = active ? 1.8 : 1.5;
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      {/* Droplet — narrow top, semi-circle bottom */}
      <View style={{
        width: 10,
        height: 14,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 5,
        borderWidth: th,
        borderColor: c,
        transform: [{ scaleY: 1.1 }, { scaleX: 0.88 }],
      }} />
      {/* Tip of droplet */}
      <View style={{
        position: 'absolute',
        top: 1,
        width: th,
        height: 5,
        backgroundColor: c,
        borderRadius: 1,
        alignSelf: 'center',
      }} />
    </View>
  );
}

function IconHabits({ active }: { active: boolean }) {
  const c = active ? SB.active : SB.inactive;
  const filled = [true, false, false, true];
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 15, gap: 3 }}>
        {filled.map((fill, i) => (
          <View key={i} style={{
            width: 6, height: 6, borderRadius: 1.5,
            borderWidth: 1.5, borderColor: c,
            backgroundColor: active && fill ? c : 'transparent',
          }} />
        ))}
      </View>
    </View>
  );
}

function IconMarketClock({ active }: { active: boolean }) {
  const c = active ? SB.active : SB.inactive;
  const th = active ? 1.8 : 1.5;
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        width: 17, height: 17, borderRadius: 9,
        borderWidth: th, borderColor: c,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <View style={{ position: 'absolute', width: 1.5, height: 4.5, borderRadius: 1, backgroundColor: c, bottom: '50%', marginBottom: -1, alignSelf: 'center' }} />
        <View style={{ position: 'absolute', width: 1.5, height: 6, borderRadius: 1, backgroundColor: c, bottom: '50%', marginBottom: -1, alignSelf: 'center', transform: [{ rotate: '60deg' }, { translateY: -1 }] }} />
        <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: c, position: 'absolute' }} />
      </View>
    </View>
  );
}

function IconMore({ active }: { active: boolean }) {
  const c = active ? SB.active : SB.inactive;
  const sizes = [4, 5, 4];
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3 }}>
      {sizes.map((sz, i) => (
        <View key={i} style={{ width: sz, height: sz, borderRadius: sz / 2, backgroundColor: c }} />
      ))}
    </View>
  );
}

// ── Nav paths ─────────────────────────────────────────────────────────────────

const NAV_PATHS = [
  { path: '/(main)',          label: 'Today',      Icon: IconToday       },
  { path: '/(main)/schedule', label: 'Schedule',   Icon: IconSchedule    },
  { path: '/(main)/ai',       label: 'AI',         Icon: IconAI          },
  { path: '/(main)/water',    label: 'Water',      Icon: IconWater       },
  { path: '/(main)/habits',   label: 'Habits',     Icon: IconHabits      },
  { path: '/(main)/markets',  label: 'Mkt Clock',  Icon: IconMarketClock },
  { path: '/(main)/more',     label: 'More',       Icon: IconMore        },
];

// ── Nav button ────────────────────────────────────────────────────────────────

function NavBtn({ item, isActive }: { item: typeof NAV_PATHS[0]; isActive: boolean }) {
  const router    = useRouter();
  const scale     = useRef(new Animated.Value(1)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  useEffect(() => {
    if (!isActive) { glowPulse.setValue(0.3); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.70, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.25, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isActive]);

  return (
    <Pressable onPress={() => router.push(item.path as any)} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[s.navBtn, { transform: [{ scale }] }]}>
        <View style={[s.iconArea, isActive && s.iconAreaActive]}>
          {isActive && (
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { borderRadius: 14, backgroundColor: SB.activeGlowBg, opacity: glowPulse }]}
            />
          )}
          <item.Icon active={isActive} />
        </View>
        <Text style={[s.label, { color: SB.active, opacity: isActive ? 0.95 : 0.72 }]} numberOfLines={1}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname   = usePathname();
  const borderGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(borderGlow, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(borderGlow, { toValue: 0, duration: 4200, useNativeDriver: true }),
        Animated.delay(1200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const glowOpacity = borderGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.70] });

  function isActive(path: string) {
    if (path === '/(main)') return pathname === '/' || pathname === '/(main)' || pathname === '/index';
    const segment = path.replace('/(main)', '');
    return pathname === segment || pathname === `/(main)${segment}`;
  }

  return (
    <BlurView intensity={55} tint="dark" style={s.sidebar}>
      {/* Dark tint so content stays readable over any background */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,12,22,0.68)', borderRadius: 28 }]} />
      <View style={s.topEdge} pointerEvents="none" />
      {/* Animated border shimmer — slow ice-blue breathing on the glass edge */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: 28, borderWidth: 1, borderColor: SB.activeGlowBorder, opacity: glowOpacity }]}
      />
      <View style={s.navList}>
        {NAV_PATHS.map((item) => (
          <NavBtn key={item.path} item={item} isActive={isActive(item.path)} />
        ))}
      </View>
      <BrandMark />
    </BlurView>
  );
}

function BrandMark() {
  const shimmer  = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer,  { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(shimmer,  { toValue: 0, duration: 2400, useNativeDriver: true }),
        Animated.delay(800),
      ]),
    );
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.2, duration: 1600, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1,   duration: 1600, useNativeDriver: true }),
        Animated.delay(400),
      ]),
    );
    shimmerLoop.start();
    dotLoop.start();
    return () => { shimmerLoop.stop(); dotLoop.stop(); };
  }, []);

  const textOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.42, 0.92] });
  const lineOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.40] });

  return (
    <View style={s.brand}>
      <Animated.View style={[s.brandLine, { backgroundColor: SB.brand, opacity: lineOpacity }]} />
      <Animated.Text style={[s.brandText, { color: SB.brand, fontFamily: Fonts.display, opacity: textOpacity }]}>
        RiRi
      </Animated.Text>
      <Animated.View style={[s.brandDot, { backgroundColor: SB.brand, opacity: dotPulse }]} />
    </View>
  );
}

const s = StyleSheet.create({
  sidebar: {
    width: 76,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 8,
    marginRight: 12,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    alignSelf: 'center',
    paddingTop: 28,
    paddingBottom: 14,
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: SB.border,
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },

  // Subtle top-edge highlight on sidebar itself
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 1,
    right: 1,
    height: 1,
    backgroundColor: SB.topEdge,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  navList: { gap: 2, width: '100%', alignItems: 'center' },

  navBtn: {
    alignItems: 'center',
    width: 78,
    gap: 3,
    paddingVertical: 5,
    justifyContent: 'center',
  },

  iconArea: {
    width: 48,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Active icon area — ice-blue ambient glow, no dot or bar
  iconAreaActive: {
    backgroundColor: SB.activeGlowBg,
    borderWidth: 1,
    borderColor: SB.activeGlowBorder,
    shadowColor: SB.activeGlowShadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 14,
    elevation: 8,
  },

  label: {
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    fontFamily: Fonts.body,
  },

  brand: {
    alignItems: 'center',
    gap: 7,
    marginTop: 'auto',
    paddingTop: 16,
  },
  brandLine: {
    width: 30,
    height: StyleSheet.hairlineWidth,
  },
  brandText: {
    fontSize: 13,
    letterSpacing: 4,
  },
  brandDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.7,
  },
});
