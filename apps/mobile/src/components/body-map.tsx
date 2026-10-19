import { MUSCLE_GROUPS } from '@gsc/shared';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

import { BODY_PARTS, BODY_VIEWBOX, type BodyPart, type BodySide } from '@/lib/body-map';
import { colors, spacing } from '@/theme';

import { AppText } from './app-text';

const SVG_ID_TO_SLUG = new Map<string, string>(MUSCLE_GROUPS.map((m) => [m.svgPathId, m.slug]));
const MIRROR = `translate(${BODY_VIEWBOX.width} 0) scale(-1 1)`;

/** Unworked muscle; worked ones are lime with opacity by intensity. */
const MIN_OPACITY = 0.22;

/**
 * Heat map of muscle groups, front and back. `intensity` is 0..1 per muscle slug
 * (`muscleIntensity`); a tap selects a muscle when `onSelect` is given.
 */
export function BodyMap({
  intensity,
  selected = null,
  onSelect,
  height = 240,
  labels = true,
}: {
  intensity: Readonly<Record<string, number>>;
  selected?: string | null;
  onSelect?: (muscle: string | null) => void;
  height?: number;
  labels?: boolean;
}) {
  const width = (height * BODY_VIEWBOX.width) / BODY_VIEWBOX.height;
  return (
    <View style={styles.row}>
      {(['front', 'back'] as const).map((side) => (
        <View key={side} style={styles.side}>
          <BodySvg
            side={side}
            width={width}
            height={height}
            intensity={intensity}
            selected={selected}
            onSelect={onSelect}
          />
          {labels ? (
            <AppText variant="caption" color="textTertiary">
              {side === 'front' ? 'Спереди' : 'Сзади'}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function BodySvg({
  side,
  width,
  height,
  intensity,
  selected,
  onSelect,
}: {
  side: BodySide;
  width: number;
  height: number;
  intensity: Readonly<Record<string, number>>;
  selected: string | null;
  onSelect?: (muscle: string | null) => void;
}) {
  const silhouette = BODY_PARTS[side].filter((p) => p.muscle === null);
  const muscles = BODY_PARTS[side].filter((p) => p.muscle !== null);
  const render = (p: BodyPart, i: number) => {
    const slug = p.muscle ? (SVG_ID_TO_SLUG.get(p.muscle) ?? p.muscle) : null;
    const value = slug ? (intensity[slug] ?? 0) : 0;
    const isSelected = slug !== null && slug === selected;
    const fill =
      slug === null ? colors.surfaceRaised : value > 0 ? colors.accent : colors.surfacePressed;
    const props = {
      key: i,
      fill,
      fillOpacity: slug !== null && value > 0 ? MIN_OPACITY + (1 - MIN_OPACITY) * value : 1,
      // No outline on the silhouette: its halves would show a seam down the middle.
      stroke: slug === null ? undefined : isSelected ? colors.text : colors.background,
      strokeWidth: isSelected ? 1.2 : 0.8,
      onPress: slug && onSelect ? () => onSelect(isSelected ? null : slug) : undefined,
    };
    const { shape } = p;
    switch (shape.kind) {
      case 'ellipse':
        return (
          <Ellipse
            {...props}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined}
          />
        );
      case 'rect':
        return (
          <Rect
            {...props}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={shape.r}
            transform={
              shape.rotate
                ? `rotate(${shape.rotate} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})`
                : undefined
            }
          />
        );
      case 'path':
        return <Path {...props} d={shape.d} />;
    }
  };

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${BODY_VIEWBOX.width} ${BODY_VIEWBOX.height}`}
      accessibilityLabel={side === 'front' ? 'Мышцы спереди' : 'Мышцы сзади'}
    >
      {/* Layers: the whole silhouette first, so its mirrored half never covers a muscle. */}
      {[silhouette, muscles].map((layer, l) => (
        <G key={l}>
          <G>{layer.map(render)}</G>
          <G transform={MIRROR}>{layer.map((p, i) => (p.mirror ? render(p, i) : null))}</G>
        </G>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-evenly' },
  side: { alignItems: 'center', gap: spacing.xs },
});
