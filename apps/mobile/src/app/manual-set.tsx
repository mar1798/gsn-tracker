import { useLocalSearchParams } from 'expo-router';

import { SetEditorScreen } from '@/screens/set-editor/set-editor';

/** `/manual-set?workoutId=…[&id=…]`: add a set the watch missed, or edit one. */
export default function ManualSetRoute() {
  const { workoutId, id } = useLocalSearchParams<{ workoutId: string; id?: string }>();
  return <SetEditorScreen target={{ kind: 'manual', workoutId, manualSetId: id || undefined }} />;
}
