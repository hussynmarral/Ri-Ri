import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { WaterProgress } from '@/components/water/WaterProgress';
import { todayDateISO } from '@/lib/scheduler/engine';
import { useAuthStore } from '@/stores/authStore';
import { useWaterStore } from '@/stores/waterStore';

const WATER_COLOR = '#38BDF8';

function formatLogTime(isoString: string) {
  const d = new Date(isoString);
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

export default function WaterScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const user   = useAuthStore((s) => s.user);
  const { todayLogs, todayTotalMl, load, addLog, deleteLog } = useWaterStore();

  const date = todayDateISO();

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id]);

  function header() {
    return (
      <View style={s.headerWrap}>
        <WaterProgress totalMl={todayTotalMl} onAdd={(ml) => user && addLog(user.id, ml)} />
        {todayLogs.length > 0 && (
          <Text style={[s.logLabel, { color: colors.placeholder }]}>Today's log</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={[...todayLogs].reverse()}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => (
          <View style={[s.logRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.logTime, { color: colors.muted }]}>{formatLogTime(item.loggedAt)}</Text>
            <Text style={[s.logAmt, { color: WATER_COLOR }]}>
              {item.amountMl}
              <Text style={[s.logUnit, { color: WATER_COLOR + '88' }]}> ml</Text>
            </Text>
            <Pressable
              onPress={() => deleteLog(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <View style={[s.delBtn, { borderColor: colors.borderStrong }]}>
                <View style={[s.delX, { backgroundColor: colors.muted }]} />
                <View style={[s.delX, s.delX2, { backgroundColor: colors.muted }]} />
              </View>
            </Pressable>
          </View>
        )}
        ListHeaderComponent={header}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={null}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  list:       { padding: 20, paddingBottom: 40 },
  headerWrap: { marginBottom: 4 },
  logLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
  },
  logTime: { flex: 1, fontSize: 14, fontWeight: '400' },
  logAmt:  { fontSize: 16, fontWeight: '600', letterSpacing: -0.3, marginRight: 14 },
  logUnit: { fontSize: 13, fontWeight: '400' },
  delBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delX: {
    position: 'absolute',
    width: 10,
    height: 1.5,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  delX2: {
    transform: [{ rotate: '-45deg' }],
  },
});
