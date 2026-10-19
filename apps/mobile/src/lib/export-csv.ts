import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

import { exportApi } from '@/lib/api/endpoints';
import { localToday } from '@/lib/format';

const BOM = '\uFEFF';

/**
 * Downloads every set as CSV and opens the share sheet ("Сохранить в Файлы", AirDrop, mail).
 * Online only: the export covers all workouts, not just the cached ones.
 */
export async function exportSetsCsv(today = localToday()): Promise<void> {
  const csv = await exportApi.setsCsv();
  const file = new File(Paths.cache, `gsc-tracker-sets-${today}.csv`);
  file.create({ overwrite: true });
  // fetch() decodes UTF-8 and drops the BOM; Excel needs it to read Cyrillic.
  await file.write(csv.startsWith(BOM) ? csv : BOM + csv);
  await Share.share({ url: file.uri });
}
