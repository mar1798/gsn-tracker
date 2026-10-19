export type FitParseErrorCode = 'not_fit' | 'corrupted' | 'no_session' | 'not_strength';

/** Expected, user-facing parse failure. `code` lets the API map it to a message. */
export class FitParseError extends Error {
  override readonly name = 'FitParseError';

  constructor(
    readonly code: FitParseErrorCode,
    message: string,
  ) {
    super(message);
  }
}
