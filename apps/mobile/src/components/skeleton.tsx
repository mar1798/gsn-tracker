import { useEffect, useState } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';

import { colors, radii } from '@/theme';

export function Skeleton({
  width = '100%',
  height,
  radius = radii.sm,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surfaceRaised, opacity },
        style,
      ]}
    />
  );
}
