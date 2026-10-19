import { Decoder, Stream } from '@garmin/fitsdk';
import { FitParseError } from './errors.js';

/** Options the observations in PLAN.md (section 4) were verified with. */
export const DECODER_OPTIONS = {
  convertDateTimesToDates: true,
  expandComponents: true,
  mergeHeartRates: true,
} as const;

/** Decodes raw FIT bytes with the official SDK. Throws `FitParseError` for non-FIT input. */
export function decodeFit(data: Uint8Array) {
  const stream = Stream.fromByteArray(data);
  if (!Decoder.isFIT(stream)) {
    throw new FitParseError('not_fit', 'File is not a FIT file');
  }
  const decoder = new Decoder(stream);
  if (!decoder.checkIntegrity()) {
    throw new FitParseError('corrupted', 'FIT file failed the CRC/integrity check');
  }
  return decoder.read(DECODER_OPTIONS);
}
