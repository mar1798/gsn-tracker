import { MUSCLE_GROUPS } from '@gsc/shared';

import { BODY_PARTS, musclesOn } from './body-map';

describe('body map', () => {
  it('draws every muscle group on the side of its region', () => {
    for (const m of MUSCLE_GROUPS) {
      expect({ muscle: m.slug, drawn: musclesOn(m.region).includes(m.svgPathId) }).toEqual({
        muscle: m.slug,
        drawn: true,
      });
    }
  });

  it('draws only known muscle groups', () => {
    const ids = new Set<string>(MUSCLE_GROUPS.map((m) => m.svgPathId));
    for (const side of ['front', 'back'] as const) {
      for (const p of BODY_PARTS[side]) if (p.muscle) expect(ids).toContain(p.muscle);
    }
  });
});
