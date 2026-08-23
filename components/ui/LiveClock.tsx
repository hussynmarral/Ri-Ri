import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Colors, { Fonts } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface Props {
  timezone?: string;
  showDate?: boolean;
  showSeconds?: boolean;
  large?: boolean;
  medium?: boolean;
  city?: string;
}

export function LiveClock({ timezone, showDate, showSeconds, large, medium, city }: Props) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  let hourPart = '';
  let restPart = '';
  let ampmPart = '';
  let dateStr   = '';
  let timeStr   = '';

  if (!timezone) {
    const now = new Date();
    const h   = now.getHours();
    const h12 = h % 12 || 12;
    const m   = pad(now.getMinutes());
    const s   = pad(now.getSeconds());
    const ap  = h >= 12 ? 'PM' : 'AM';

    hourPart = String(h12);
    restPart = `:${m}${showSeconds ? ':' + s : ''}`;
    ampmPart = ` ${ap}`;
    timeStr  = `${hourPart}${restPart}${ampmPart}`;

    if (showDate) {
      dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
  } else {
    try {
      const now = new Date();
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric', minute: '2-digit',
        ...(showSeconds ? { second: '2-digit' } : {}),
        hour12: true,
      });
      timeStr = fmt.format(now);
      const colonIdx = timeStr.indexOf(':');
      hourPart = colonIdx >= 0 ? timeStr.slice(0, colonIdx) : timeStr;
      const spaceIdx = timeStr.lastIndexOf(' ');
      restPart = timeStr.slice(colonIdx, spaceIdx >= 0 ? spaceIdx : undefined);
      ampmPart = spaceIdx >= 0 ? timeStr.slice(spaceIdx) : '';

      if (showDate) {
        dateStr = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'short', month: 'short', day: 'numeric',
        }).format(now);
      }
    } catch {
      hourPart = '--';
      restPart = ':--';
      ampmPart = '';
    }
  }

  if (large || medium) {
    const timeFontSize   = large ? 86  : 52;
    const timeLineHeight = large ? 90  : 56;
    const timeTracking   = large ? -4  : -2;
    const ampmFontSize   = large ? 22  : 14;
    const ampmMarginB    = large ? 12  : 8;
    const cityFontSize   = large ? 12  : 10;
    const dateFontSize   = large ? 17  : 13;
    return (
      <View>
        {city && (
          <Text style={[cl.cityLarge, { color: colors.muted, fontSize: cityFontSize }]}>{city}</Text>
        )}
        <View style={cl.clockRow}>
          <Text style={[cl.timeLarge, { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: timeFontSize, lineHeight: timeLineHeight, letterSpacing: timeTracking }]}>
            {hourPart}
          </Text>
          <Text style={[cl.timeLarge, { color: '#FFFFFF', fontFamily: Fonts.display, fontSize: timeFontSize, lineHeight: timeLineHeight, letterSpacing: timeTracking }]}>
            {restPart}
          </Text>
          <Text style={[cl.ampmLarge, { color: '#AEBBD1', fontFamily: Fonts.display, fontSize: ampmFontSize, marginBottom: ampmMarginB }]}>
            {ampmPart}
          </Text>
        </View>
        {showDate && (
          <Text style={[cl.dateLarge, { color: colors.muted, fontFamily: Fonts.body, fontSize: dateFontSize }]}>
            {dateStr}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={cl.row}>
      {city && (
        <Text style={[cl.citySmall, { color: colors.muted }]}>{city}</Text>
      )}
      <Text style={[cl.timeSmall, { color: colors.textSecondary, fontFamily: Fonts.display }]}>
        {timeStr}
      </Text>
    </View>
  );
}

const cl = StyleSheet.create({
  clockRow:  { flexDirection: 'row', alignItems: 'baseline' },
  row:       { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  cityLarge: { letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  timeLarge: { letterSpacing: -4, lineHeight: 90 },
  ampmLarge: { letterSpacing: 0, alignSelf: 'flex-end', marginLeft: 4 },
  dateLarge: { marginTop: 8, letterSpacing: 0.2 },
  citySmall: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  timeSmall: { fontSize: 16, letterSpacing: -0.3 },
});
