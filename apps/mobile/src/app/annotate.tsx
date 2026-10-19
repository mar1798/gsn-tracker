import { useLocalSearchParams } from 'expo-router';

import { SetEditorScreen } from '@/screens/set-editor/set-editor';

/** `/annotate?workoutId=…&setIds=a,b,c`: one set or bulk annotation. */
export default function AnnotateRoute() {
  const { workoutId, setIds } = useLocalSearchParams<{ workoutId: string; setIds: string }>();
  return (
    <SetEditorScreen
      target={{ kind: 'garmin', workoutId, setIds: setIds ? setIds.split(',') : [] }}
    />
  );
}
