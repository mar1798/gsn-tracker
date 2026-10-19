// Geometry of the body map: our own simplified figure (front and back), not third-party art.
// One side is drawn and mirrored around x = 50; centre shapes (abs, traps, lower back) are not.
// Each muscle shape is keyed by the muscle group's `svgPathId` (= slug).

export const BODY_VIEWBOX = { width: 100, height: 212 } as const;

export type Shape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | {
      kind: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      r: number;
      rotate?: number;
    }
  | { kind: 'path'; d: string };

export interface BodyPart {
  /** `svgPathId` of a muscle group; null = neutral silhouette. */
  muscle: string | null;
  shape: Shape;
  /** Drawn on both sides of the body. */
  mirror: boolean;
}

export type BodySide = 'front' | 'back';

const part = (muscle: string | null, shape: Shape, mirror = true): BodyPart => ({
  muscle,
  shape,
  mirror,
});

/** Head, neck, torso, limbs: shared by both views, muscles are drawn on top. */
const SILHOUETTE: BodyPart[] = [
  part(null, { kind: 'ellipse', cx: 50, cy: 13, rx: 8.5, ry: 10.5 }, false),
  part(null, { kind: 'rect', x: 45, y: 21, width: 10, height: 10, r: 3 }, false),
  part(null, { kind: 'path', d: 'M50 29 L38 30.5 Q29 33 26.5 40 L29 60 Q33 78 35 97 L50 99 Z' }),
  part(null, { kind: 'path', d: 'M35 95 L50 97 L50 113 L33.5 111 Z' }),
  part(null, { kind: 'rect', x: 19, y: 41, width: 10, height: 35, r: 5, rotate: 8 }),
  part(null, { kind: 'rect', x: 15, y: 77, width: 10, height: 33, r: 5, rotate: 6 }),
  part(null, { kind: 'ellipse', cx: 17.5, cy: 115, rx: 4, ry: 6 }),
  part(null, { kind: 'rect', x: 33, y: 108, width: 16.5, height: 57, r: 8 }),
  part(null, { kind: 'rect', x: 35, y: 167, width: 12.5, height: 36, r: 6 }),
  part(null, { kind: 'ellipse', cx: 41, cy: 206, rx: 6.5, ry: 3.5 }),
];

const FOREARM = part('forearms', { kind: 'ellipse', cx: 20, cy: 92, rx: 4.6, ry: 13.5, rotate: 6 });

const FRONT: BodyPart[] = [
  part('front_delts', { kind: 'ellipse', cx: 33, cy: 38.5, rx: 5.5, ry: 6.5, rotate: -25 }),
  part('side_delts', { kind: 'ellipse', cx: 26, cy: 43, rx: 4, ry: 7.5, rotate: 12 }),
  part('chest', { kind: 'path', d: 'M49 34 L39.5 35 Q33 38 33.5 47 Q37 55.5 49 54.5 Z' }),
  part('biceps', { kind: 'ellipse', cx: 24.5, cy: 59, rx: 4.6, ry: 11, rotate: 8 }),
  FOREARM,
  part('abs', { kind: 'rect', x: 43, y: 57.5, width: 14, height: 36, r: 5 }, false),
  part('obliques', { kind: 'path', d: 'M41.5 58.5 L36.5 60.5 Q35.5 76 38.5 92 L41.5 92.5 Z' }),
  part('quads', { kind: 'ellipse', cx: 40, cy: 136, rx: 6.5, ry: 23 }),
  part('adductors', { kind: 'path', d: 'M49.2 113 L47 113 Q45.2 124 47.6 142 L49.2 142 Z' }),
];

const BACK: BodyPart[] = [
  part('traps', { kind: 'path', d: 'M50 23 L39 32 L44 36.5 L50 53 L56 36.5 L61 32 Z' }, false),
  part('rear_delts', { kind: 'ellipse', cx: 29.5, cy: 40.5, rx: 6, ry: 6.5, rotate: -10 }),
  part('triceps', { kind: 'ellipse', cx: 24, cy: 59, rx: 4.6, ry: 11, rotate: 8 }),
  FOREARM,
  part('lats', { kind: 'path', d: 'M43.5 39 Q35 41 32 48 Q34 66 42 80 L48.8 74 L48.8 55 Z' }),
  part('lower_back', { kind: 'rect', x: 43, y: 80, width: 14, height: 16, r: 4 }, false),
  part('glutes', { kind: 'ellipse', cx: 41.5, cy: 113, rx: 8, ry: 9 }),
  part('hamstrings', { kind: 'ellipse', cx: 41, cy: 141, rx: 7, ry: 19 }),
  part('calves', { kind: 'ellipse', cx: 41.2, cy: 181, rx: 5.6, ry: 12.5 }),
];

export const BODY_PARTS: Record<BodySide, BodyPart[]> = {
  front: [...SILHOUETTE, ...FRONT],
  back: [...SILHOUETTE, ...BACK],
};

/** Muscles drawn on a side (forearms on both). */
export const musclesOn = (side: BodySide) => [
  ...new Set(BODY_PARTS[side].flatMap((p) => (p.muscle ? [p.muscle] : []))),
];
