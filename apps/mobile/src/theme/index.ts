import type { TextStyle } from 'react-native';

// Design tokens. Dark-first (the app is used in the gym), after the dark reference in `design/`:
// near-black background, graphite cards with large radii, a single lime accent.
// Screens and components use only these tokens, never raw values.

export const colors = {
  background: '#0D0E0B',
  surface: '#1B1C18',
  surfaceRaised: '#262722',
  surfacePressed: '#30312B',
  border: '#33342E',
  text: '#F4F5EF',
  textSecondary: '#A3A59A',
  textTertiary: '#6E7066',
  accent: '#D6F45B',
  accentPressed: '#C2E046',
  accentMuted: 'rgba(214, 244, 91, 0.16)',
  onAccent: '#11120E',
  danger: '#FF6B5B',
  dangerMuted: 'rgba(255, 107, 91, 0.14)',
  heartRate: '#FF8A7A',
  heartRateMuted: 'rgba(255, 138, 122, 0.18)',
  calories: '#FFC35C',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** Minimum touch target (gym use: sweaty hands, gloves). */
export const hitSize = 48;

export const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -0.8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  /** Big numbers: the main element of metric cards. */
  metric: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
export type ColorToken = keyof typeof colors;
