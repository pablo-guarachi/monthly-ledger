/**
 * Monthly Ledger · design tokens.
 * Warm "paper" light theme, deep "ink" dark theme. Manrope for text,
 * JetBrains Mono for every number. Never Inter.
 */

export type Mode = 'light' | 'dark';
export type ThemePref = 'system' | Mode;

export const fonts = {
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  extrabold: 'Manrope-ExtraBold',
  mono: 'JetBrainsMono-Medium',
  monoBold: 'JetBrainsMono-SemiBold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const type = {
  /** the one number that answers the screen's question (e.g. this month's fixed costs) */
  hero: { size: 44, line: 52 },
  display: { size: 34, line: 40 },
  h1: { size: 24, line: 30 },
  h2: { size: 18, line: 24 },
  body: { size: 15, line: 22 },
  label: { size: 13, line: 18 },
  caption: { size: 12, line: 16 },
} as const;

/** Minimum touch target (dp). Android/Material guidance is 48, WCAG 2.5.8 / Apple HIG 44. */
export const touch = 44;

export type ThemeColors = {
  mode: Mode;
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
};

export const light: ThemeColors = {
  mode: 'light',
  bg: '#F6F1E6',
  surface: '#FFFDF8',
  surface2: '#EFE8DA',
  ink: '#14232B',
  ink2: '#4F5B64',
  muted: '#656E76',
  border: '#E3DCCB',
  accent: '#17785F',
  accentSoft: '#D9F0E8',
  onAccent: '#FFFFFF',
  warn: '#94560A',
  warnSoft: '#FBEBD0',
  danger: '#B03A31',
  dangerSoft: '#F8DDD8',
  overlay: 'rgba(20,35,43,0.35)',
};

export const dark: ThemeColors = {
  mode: 'dark',
  bg: '#0F1D26',
  surface: '#16272F',
  surface2: '#1E303A',
  ink: '#F2EEE4',
  ink2: '#B5BDC3',
  muted: '#909AA2',
  border: '#26383F',
  accent: '#3FBF9C',
  accentSoft: '#17352F',
  onAccent: '#0B1A14',
  warn: '#E8A03C',
  warnSoft: '#3A2B14',
  danger: '#EE7A6A',
  dangerSoft: '#3C1F1B',
  overlay: 'rgba(0,0,0,0.5)',
};

/** Per-kind colours, shared by both themes (chosen to read on paper and ink). */
export const kindColors: Record<string, string> = {
  subscription: '#7C5CE6',
  loan: '#E07A2F',
  housing: '#3B82C4',
  utility: '#1FA3B8',
  insurance: '#6B7A8F',
  savings: '#2EAA8C',
  other: '#8A939B',
};
