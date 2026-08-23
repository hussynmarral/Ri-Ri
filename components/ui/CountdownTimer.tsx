import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  targetIso: string;   // ISO datetime string of when the block ends
  onExpired?: () => void;
  compact?: boolean;   // smaller rendering for list items
}

function getSecondsLeft(isoTarget: string): number {
  return Math.max(0, Math.floor((new Date(isoTarget).getTime() - Date.now()) / 1000));
}

export function CountdownTimer({ targetIso, onExpired, compact }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [secs, setSecs] = useState(() => getSecondsLeft(targetIso));
  const firedRef = useRef(false);

  useEffect(() => {
    setSecs(getSecondsLeft(targetIso));
    firedRef.current = false;
    const id = setInterval(() => {
      const remaining = getSecondsLeft(targetIso);
      setSecs(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const h  = Math.floor(secs / 3600);
  const m  = Math.floor((secs % 3600) / 60);
  const s  = secs % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (compact) {
    const label = h > 0
      ? `${h}h ${pad(m)}m`
      : `${m}m ${pad(s)}s`;
    return (
      <Text style={[st.compact, { color: colors.primary, fontFamily: Fonts.mono }]}>{label}</Text>
    );
  }

  return (
    <View style={st.row}>
      {h > 0 && (
        <>
          <Block value={pad(h)} label="hr" colors={colors} />
          <Sep colors={colors} />
        </>
      )}
      <Block value={pad(m)} label="min" colors={colors} />
      <Sep colors={colors} />
      <Block value={pad(s)} label="sec" colors={colors} />
    </View>
  );
}

function Block({ value, label, colors }: { value: string; label: string; colors: (typeof Colors)['dark'] }) {
  return (
    <View style={st.block}>
      <Text style={[st.digit, { color: colors.text, fontFamily: Fonts.display }]}>{value}</Text>
      <Text style={[st.unit, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

function Sep({ colors }: { colors: (typeof Colors)['dark'] }) {
  return <Text style={[st.sep, { color: colors.placeholder }]}>:</Text>;
}

const st = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  block:  { alignItems: 'center', minWidth: 48 },
  digit:  { fontSize: 40, letterSpacing: -1.5, lineHeight: 44 },
  unit:   { fontSize: 11, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 3 },
  sep:    { fontSize: 32, fontWeight: '300', marginBottom: 8, marginHorizontal: 2 },
  compact:{ fontSize: 14, letterSpacing: 0.2 },
});
