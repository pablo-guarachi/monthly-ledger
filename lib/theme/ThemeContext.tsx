import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { dark, light, type ThemeColors, type ThemePref } from './tokens';
import { useSettings } from '@/lib/store/useSettings';

const ThemeCtx = createContext<ThemeColors>(light);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.themePref);
  const value = useMemo(() => resolve(pref, system), [pref, system]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

function resolve(pref: ThemePref, system: string | null | undefined): ThemeColors {
  const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return mode === 'dark' ? dark : light;
}

export function useTheme(): ThemeColors {
  return useContext(ThemeCtx);
}
