import type { z } from 'zod';

/** Parses env vars with a zod schema and fails fast with a readable message. */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, unknown>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}
