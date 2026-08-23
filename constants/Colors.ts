// ─── Design Token System — Ri Ri ──────────────────────────────────────────────
// Palette: #060810 (near-black) · #0A0E1A (dark bg) · #0F1525 (surface)
//          #91A4C7 (primary ice-blue) · #AEBBD1 (light ice) · #596B89 (deep navy-blue)
//          #C8D5E8 (silver-ice) · #E8F0F8 (frost-white)
// Fonts:   Marcellus (display) · Libre Baskerville (body)

const nearBlack   = '#060810';
const darkBase    = '#0A0E1A';
const surface1    = '#0F1525';
const bluePrimary = '#91A4C7';
const blueLight   = '#AEBBD1';
const blueDark    = '#596B89';
const silverIce   = '#C8D5E8';
const frostWhite  = '#E8F0F8';
const textPrimary = '#F2F6FC';
const textSecond  = '#C8D5E8';
const mutedA      = '#8FA4BC';
const mutedB      = '#6A849E';

export const Fonts = {
  display:    'Marcellus_400Regular',
  body:       'LibreBaskerville_400Regular',
  bodyBold:   'LibreBaskerville_700Bold',
  bodyItalic: 'LibreBaskerville_700Bold',
  mono:       'SpaceMono',
};

const dark = {
  // ── Surfaces — blue-midnight tinted dark (ice-blue accent) ──────────────────
  background:   nearBlack,
  surface:     'rgba(11,16,30,0.92)',
  elevated:    'rgba(13,20,40,0.95)',
  overlay:     'rgba(6,8,16,0.97)',

  glass:       'rgba(10,16,28,0.87)',
  glassBorder: 'rgba(174,187,209,0.18)',
  glassInner:  'rgba(174,187,209,0.09)',

  // ── Typography: White → Light blue-gray → Muted blue-gray ────────────────────
  text:          textPrimary,
  textSecondary: textSecond,
  muted:         mutedA,
  placeholder:   mutedB,

  // ── Borders — blue-tinted ice-glass ──────────────────────────────────────────
  border:       'rgba(174,187,209,0.18)',
  borderStrong: 'rgba(174,187,209,0.32)',

  // ── Accent ────────────────────────────────────────────────────────────────────
  primary:         bluePrimary,
  accentTint:     'rgba(145,164,199,0.16)',
  tint:            bluePrimary,
  tabIconDefault:  mutedA,
  tabIconSelected: blueLight,

  // ── Semantic — brightest = positive, mid = attention, darker = concern ────────
  success:     '#AEBBD1',   // light ice — brightest in palette = positive
  successTint: 'rgba(174,187,209,0.16)',
  warning:     '#8FA4BC',   // mid-steel — attention
  warningTint: 'rgba(143,164,188,0.13)',
  danger:      '#6A849E',   // dark steel — concern/negative
  dangerTint:  'rgba(106,132,158,0.14)',

  card: '#1A1A1C',
};

const light = {
  background:   '#E8EBF0',
  surface:      '#F0F3F7',
  elevated:     '#E2E7EE',
  overlay:      'rgba(18,22,28,0.40)',

  glass:        'rgba(145,164,199,0.10)',
  glassBorder:  'rgba(89,107,137,0.20)',
  glassInner:   'rgba(255,255,255,0.70)',

  text:          '#12161C',
  textSecondary: '#2D3748',
  muted:         '#596B89',
  placeholder:   '#8993A3',

  border:       'rgba(89,107,137,0.18)',
  borderStrong: 'rgba(89,107,137,0.34)',

  primary:         blueDark,
  accentTint:     'rgba(89,107,137,0.14)',
  tint:            blueDark,
  tabIconDefault:  mutedA,
  tabIconSelected: '#12161C',

  success:     blueDark,
  successTint: 'rgba(89,107,137,0.14)',
  warning:     mutedA,
  warningTint: 'rgba(145,164,199,0.14)',
  danger:      '#4A5568',
  dangerTint:  'rgba(89,107,137,0.14)',

  card: '#F0F3F7',
};

const Colors = { dark, light };

export default Colors;

// ─── Category colours — blue-gray shades only ─────────────────────────────────
export const CATEGORY_COLOR: Record<string, string> = {
  shopify:      '#91A4C7',  // ice-blue
  agency:       '#6B7FA0',  // deep steel-blue
  office:       '#A8BCE0',  // light ice
  gym:          '#7B93B5',  // mid-steel
  language:     '#C8D5E8',  // silver-ice
  shower:       '#596B89',  // navy
  skincare:     '#B4C5DB',  // pale ice
  meal:         '#9BB0CC',  // steel-blue
  reading:      '#9BB0CC',  // steel-blue
  content:      '#91A4C7',  // ice-blue
  review:       '#6A849E',  // dark steel
  sleep:        '#4D6480',  // deep midnight-blue
  water:        '#91A4C7',  // ice-blue
  supplements:  '#7A90A8',  // muted blue
  flex:         '#AEBBD1',  // light blue-grey
  movement:     '#91A4C7',  // ice-blue
  weekend_run:  '#8FA4BC',  // silvery-blue
  weekly_reset: '#596B89',  // navy
  other:        '#91A4C7',  // ice-blue
};

export const CATEGORY_TINT: Record<string, string> = {
  shopify:      'rgba(145,164,199,0.14)',
  agency:       'rgba(89,107,137,0.16)',
  office:       'rgba(145,164,199,0.14)',
  gym:          'rgba(89,107,137,0.16)',
  language:     'rgba(137,147,163,0.14)',
  shower:       'rgba(89,107,137,0.16)',
  skincare:     'rgba(145,164,199,0.14)',
  meal:         'rgba(89,107,137,0.16)',
  reading:      'rgba(137,147,163,0.14)',
  content:      'rgba(145,164,199,0.14)',
  review:       'rgba(89,107,137,0.16)',
  sleep:        'rgba(137,147,163,0.14)',
  water:        'rgba(145,164,199,0.14)',
  supplements:  'rgba(89,107,137,0.16)',
  flex:         'rgba(137,147,163,0.14)',
  movement:     'rgba(145,164,199,0.14)',
  weekend_run:  'rgba(137,147,163,0.14)',
  weekly_reset: 'rgba(89,107,137,0.16)',
  other:        'rgba(145,164,199,0.14)',
};

export const HABIT_COLOR: Record<string, string> = {
  reading:     '#91A4C7',
  english:     '#596B89',
  turkish:     '#8993A3',
  skincare:    '#AEBBD1',
  haircare:    '#8993A3',
  supplements: '#596B89',
};
