import { useLocalSearchParams } from 'expo-router';

import { ImportFitScreen } from '@/screens/import/import-fit';

export default function ImportRoute() {
  const { uri, name } = useLocalSearchParams<{ uri?: string; name?: string }>();
  return <ImportFitScreen file={uri && name ? { uri, name } : null} />;
}
