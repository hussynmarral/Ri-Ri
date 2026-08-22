import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { WaterProgress } from '@/components/water/WaterProgress';
import { todayDateISO } from '@/lib/scheduler/engine';
import { useAuthStore } from '@/stores/authStore';
import { useWaterStore } from '@/stores/waterStore';

function formatLogTime(isoString: string) {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function WaterScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const user = useAuthStore((s) => s.user);
  const { todayLogs, todayTotalMl, load, addLog, deleteLog } = useWaterStore();

  const date = todayDateISO();

  useEffect(() => {
    if (user) load(user.id, date);
  }, [user?.id]);

  function header() {
    return (
      <View style={s.headerWrap}>
        <WaterProgress
          totalMl={todayTotalMl}
          onAdd={(ml) => user && addLog(user.id, ml)}
        />
        {todayLogs.length > 0 && (
          <Text style={[s.logLabel, { color: colors.muted }]}>Today's log</Text>
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
          <View style={[s.logRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.logTime, { color: colors.muted }]}>{formatLogTime(item.loggedAt)}</Text>
            <Text style={[s.logAmt, { color: '#38BDF8' }]}>{item.amountMl} ml</Text>
            <TouchableOpacity onPress={() => deleteLog(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[s.del, { color: colors.danger }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListHeaderComponent={header}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.listEmpty}>
            <Text style={[s.emptyText, { color: colors.muted }]}>No logs yet. Add some water!</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  headerWrap: { marginBottom: 4 },
  logLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  logTime: { flex: 1, fontSize: 14 },
  logAmt: { fontSize: 15, fontWeight: '700', marginRight: 12 },
  del: { fontSize: 16, fontWeight: '700' },
  listEmpty: { paddingTop: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
