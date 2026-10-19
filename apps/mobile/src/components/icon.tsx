import { SymbolView, type SFSymbol, type SymbolWeight } from 'expo-symbols';

import { colors, type ColorToken } from '@/theme';

export type IconName = SFSymbol;

export function Icon({
  name,
  size = 20,
  color = 'text',
  weight = 'semibold',
}: {
  name: IconName;
  size?: number;
  color?: ColorToken;
  weight?: SymbolWeight;
}) {
  return <SymbolView name={name} size={size} tintColor={colors[color]} weight={weight} />;
}
