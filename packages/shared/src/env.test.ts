import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseEnv } from './env.js';

const schema = z.object({ PORT: z.coerce.number().int().positive() });

describe('parseEnv', () => {
  it('returns parsed values', () => {
    expect(parseEnv(schema, { PORT: '3000' })).toEqual({ PORT: 3000 });
  });

  it('throws with the failing key in the message', () => {
    expect(() => parseEnv(schema, {})).toThrow(/PORT/);
  });
});
