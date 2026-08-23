import { StyleSheet, View } from 'react-native';

/**
 * Option 1 — Corner Vignette Depth.
 * Pure dark/light contrast only. No color, no animation.
 * Deep black corners + barely lifted centre = studio monitor feel.
 * Reduced opacity for subtlety.
 */
export function RadialBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">

      {/* Base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#080A0E' }]} />

      {/* Centre lift — very faint, just enough to separate bg from pure black */}
      <View style={s.centreLift} />

      {/* Corner vignettes — deep black crushing inward from each corner */}
      <View style={s.cornerTL} />
      <View style={s.cornerTR} />
      <View style={s.cornerBL} />
      <View style={s.cornerBR} />

    </View>
  );
}

const s = StyleSheet.create({

  // Centre lift — covers most of the screen, barely lighter than base
  centreLift: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    right: '-10%',
    bottom: '-10%',
    borderRadius: 999,
    backgroundColor: 'rgba(20,22,26,0.50)',
  },

  // Four oversized corners — extend well past centre so vignette fills screen
  cornerTL: {
    position: 'absolute',
    top: 0, left: 0,
    width: '80%', height: '80%',
    borderBottomRightRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cornerTR: {
    position: 'absolute',
    top: 0, right: 0,
    width: '75%', height: '75%',
    borderBottomLeftRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0, left: 0,
    width: '75%', height: '75%',
    borderTopRightRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: '80%', height: '80%',
    borderTopLeftRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
});
