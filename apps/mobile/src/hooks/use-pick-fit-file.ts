import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { importHref } from '@/lib/fit-file';

/** Opens the system file picker and hands the chosen file to the import screen. */
export function usePickFitFile() {
  const router = useRouter();
  return useCallback(async () => {
    // FIT has no system UTI, so any file is selectable; the import screen checks the extension.
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset) router.push(importHref({ uri: asset.uri, name: asset.name }));
  }, [router]);
}
