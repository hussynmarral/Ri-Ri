import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { WORLD_CITIES, type WorldCity } from '@/lib/worldCities';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getNow(tz: string) {
  try {
    const d = new Date();
    return {
      time: new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      }).format(d),
      date: new Intl.DateTimeFormat('en-US', {
        timeZone: tz, weekday: 'short', month: 'short', day: 'numeric',
      }).format(d),
      offset: getOffsetLabel(tz, d),
    };
  } catch {
    return { time: '--:--', date: '--', offset: '' };
  }
}

function getOffsetLabel(tz: string, now: Date): string {
  try {
    const localOffset = -now.getTimezoneOffset();
    const tzOffset    = getTimezoneOffset(tz, now);
    const diff = Math.round((tzOffset - localOffset) / 60);
    if (diff === 0) return 'Local';
    return diff > 0 ? `+${diff}h` : `${diff}h`;
  } catch { return ''; }
}

function getTimezoneOffset(tz: string, date: Date): number {
  const utcStr  = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr   = date.toLocaleString('en-US', { timeZone: tz });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
}

// ── Clock card ────────────────────────────────────────────────────────────────

function ClockCard({
  city, colors, onRemove,
}: {
  city: WorldCity;
  colors: typeof Colors.dark;
  onRemove?: () => void;
}) {
  const { time, date, offset } = getNow(city.timezone);
  const isHome = !!city.alwaysOn;

  return (
    <GlassCard style={cl.card} radius={20}>
      <View style={cl.inner}>
        <View style={cl.top}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[cl.flag, { color: colors.muted, fontFamily: Fonts.body }]}>{city.flag} · {city.country}</Text>
            <Text style={[cl.cityName, { color: isHome ? colors.text : colors.textSecondary, fontFamily: Fonts.display }]} numberOfLines={1}>
              {city.city}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[cl.offsetBadge, { backgroundColor: isHome ? colors.primary + '22' : colors.elevated }]}>
              <Text style={[cl.offsetText, { color: isHome ? colors.primary : colors.muted }]}>{offset}</Text>
            </View>
            {!isHome && onRemove && (
              <Pressable
                onPress={onRemove}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={({ pressed }) => [cl.removeBtn, { borderColor: colors.borderStrong, opacity: pressed ? 0.4 : 0.7 }]}
              >
                <View style={[cl.removeX,  { backgroundColor: colors.muted }]} />
                <View style={[cl.removeX, cl.removeX2, { backgroundColor: colors.muted }]} />
              </Pressable>
            )}
          </View>
        </View>

        <Text style={[cl.time, { color: colors.text, fontFamily: Fonts.display }]}>{time}</Text>
        <Text style={[cl.date, { color: colors.placeholder, fontFamily: Fonts.body }]}>{date}</Text>

        {isHome && (
          <View style={[cl.homeTag, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[cl.homeTagText, { color: colors.primary, fontFamily: Fonts.body }]}>Home</Text>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

const cl = StyleSheet.create({
  card:       { marginBottom: 12 },
  inner:      { padding: 20 },
  top:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  flag:       { fontSize: 11, letterSpacing: 0.5, marginBottom: 3 },
  cityName:   { fontSize: 20, letterSpacing: -0.6 },
  offsetBadge:{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  offsetText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  time:       { fontSize: 38, letterSpacing: -1.5, lineHeight: 42, marginBottom: 4 },
  date:       { fontSize: 13 },
  homeTag:    { marginTop: 10, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  homeTagText:{ fontSize: 11, letterSpacing: 0.3 },
  removeBtn:  { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  removeX:    { position: 'absolute', width: 10, height: 1.5, borderRadius: 1, transform: [{ rotate: '45deg'  }] },
  removeX2:   { transform: [{ rotate: '-45deg' }] },
});

// ── City picker modal ──────────────────────────────────────────────────────────

function CityPicker({
  visible, onClose, enabledIds, onToggle, colors,
}: {
  visible: boolean;
  onClose: () => void;
  enabledIds: string[];
  onToggle: (id: string, enabled: boolean) => void;
  colors: typeof Colors.dark;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return WORLD_CITIES.filter((c) => !c.alwaysOn).filter((c) =>
      !q ||
      c.city.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.flag.toLowerCase().includes(q) ||
      c.timezone.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <Pressable style={cp.backdrop} onPress={onClose} />
      <View style={[cp.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[cp.handle, { backgroundColor: colors.borderStrong }]} />

        <View style={cp.topRow}>
          <Text style={[cp.title, { color: colors.text, fontFamily: Fonts.display }]}>Add Cities</Text>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[cp.count, { color: colors.muted, fontFamily: Fonts.body }]}>{enabledIds.length} added</Text>
            <Text style={[{ fontSize: 10, color: colors.placeholder, fontFamily: Fonts.body }]}>180+ cities</Text>
          </View>
        </View>

        {/* Search */}
        <View style={[cp.searchRow, { backgroundColor: colors.elevated, borderColor: colors.borderStrong }]}>
          <View style={cp.searchIcon}>
            <View style={[cp.searchCircle, { borderColor: colors.muted }]} />
            <View style={[cp.searchHandle, { backgroundColor: colors.muted }]} />
          </View>
          <TextInput
            style={[cp.searchInput, { color: colors.text, fontFamily: Fonts.body }]}
            placeholder="Search city or country…"
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!query && (
            <Pressable onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ color: colors.muted, fontSize: 16, paddingHorizontal: 4 }}>×</Text>
            </Pressable>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 && (
            <Text style={[cp.empty, { color: colors.muted, fontFamily: Fonts.body }]}>No cities found.</Text>
          )}
          {filtered.map((city) => {
            const active = enabledIds.includes(city.id);
            return (
              <Pressable
                key={city.id}
                onPress={() => onToggle(city.id, !active)}
                style={({ pressed }) => [
                  cp.row,
                  { borderBottomColor: colors.border, backgroundColor: pressed ? colors.elevated : 'transparent' },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[cp.cityName, { color: colors.text, fontFamily: Fonts.display }]}>{city.city}</Text>
                  <Text style={[cp.tz, { color: colors.muted, fontFamily: Fonts.body }]}>
                    {city.flag} {city.country} · {city.timezone}
                  </Text>
                </View>
                <View style={[
                  cp.check,
                  { borderColor: active ? colors.primary : colors.borderStrong,
                    backgroundColor: active ? colors.primary : 'transparent' },
                ]}>
                  {active && (
                    <>
                      <View style={[cp.tickS, { backgroundColor: '#000' }]} />
                      <View style={[cp.tickL, { backgroundColor: '#000' }]} />
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const cp = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    padding: 20, paddingBottom: 40,
  },
  handle:   { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  topRow:   { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  title:    { fontSize: 24, letterSpacing: -0.8 },
  count:    { fontSize: 13 },
  searchRow:{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, gap: 10 },
  searchIcon:{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  searchCircle: { width: 11, height: 11, borderRadius: 6, borderWidth: 1.5, position: 'absolute', top: 0, left: 0 },
  searchHandle: { width: 5, height: 1.5, borderRadius: 1, position: 'absolute', bottom: 0, right: 0, transform: [{ rotate: '-45deg' }] },
  searchInput:  { flex: 1, fontSize: 14, padding: 0 },
  empty:    { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 2 },
  cityName: { fontSize: 16, letterSpacing: -0.3 },
  tz:       { fontSize: 11, marginTop: 2, letterSpacing: 0.2 },
  check:    { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tickS:    { position: 'absolute', left: 1, bottom: 3, width: 5, height: 2, borderRadius: 1, transform: [{ rotate: '45deg'  }] },
  tickL:    { position: 'absolute', right: 0, bottom: 2, width: 9, height: 2, borderRadius: 1, transform: [{ rotate: '-45deg' }] },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function MarketsScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const user   = useAuthStore((s) => s.user);
  const { settings, load: loadSettings, update: updateSettings } = useSettingsStore();
  const [tick,       setTick]       = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (user) loadSettings(user.id);
  }, [user?.id]);

  // Tick every second for live clock
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const enabledIds = settings?.enabledMarkets ?? ['nyc', 'chi', 'lax', 'lon', 'ist'];

  const visibleCities = useMemo(
    () => WORLD_CITIES.filter((c) => c.alwaysOn || enabledIds.includes(c.id)),
    [enabledIds],
  );

  async function toggleCity(id: string, enable: boolean) {
    const current = settings?.enabledMarkets ?? ['nyc', 'chi', 'lax', 'lon', 'ist'];
    const next = enable ? [...current, id] : current.filter((x) => x !== id);
    await updateSettings({ enabledMarkets: next });
  }

  return (
    <ScreenTransition>
      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View>
            <Text style={[s.headerSub, { color: colors.muted, fontFamily: Fonts.body }]}>International</Text>
            <Text style={[s.headerTitle, { color: colors.text, fontFamily: Fonts.display }]}>Markets</Text>
          </View>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [s.addBtn, { borderColor: colors.borderStrong, backgroundColor: pressed ? colors.elevated : 'transparent' }]}
          >
            <View style={s.addPlus}>
              <View style={[s.plusH, { backgroundColor: colors.primary }]} />
              <View style={[s.plusV, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={[s.addLabel, { color: colors.primary, fontFamily: Fonts.body }]}>Add</Text>
          </Pressable>
        </View>

        <Text style={[s.sectionLabel, { color: colors.placeholder, fontFamily: Fonts.body }]}>Live Clocks</Text>

        {visibleCities.map((city) => (
          <ClockCard
            key={city.id}
            city={city}
            colors={colors}
            onRemove={city.alwaysOn ? undefined : () => toggleCity(city.id, false)}
          />
        ))}

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.placeholder, fontFamily: Fonts.body }]}>
            {enabledIds.length + 1} cities · Tap + to add more
          </Text>
        </View>
      </ScrollView>

      <CityPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        enabledIds={enabledIds}
        onToggle={toggleCity}
        colors={colors}
      />
    </ScreenTransition>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  content:    { padding: 20, paddingTop: 52, paddingBottom: 40 },
  header:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 },
  headerSub:  { fontSize: 13, letterSpacing: 0.2, marginBottom: 4 },
  headerTitle:{ fontSize: 36, letterSpacing: -1.5 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 4 },
  addPlus:    { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  plusH:      { position: 'absolute', width: 12, height: 1.5, borderRadius: 1 },
  plusV:      { position: 'absolute', width: 1.5, height: 12, borderRadius: 1 },
  addLabel:   { fontSize: 13, letterSpacing: 0.2 },
  sectionLabel:{ fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 },
  footer:     { marginTop: 4, alignItems: 'center' },
  footerText: { fontSize: 12, textAlign: 'center' },
});
