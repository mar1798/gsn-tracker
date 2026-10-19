import { useLocalSearchParams } from 'expo-router';

import { ExerciseFormScreen } from '@/screens/exercises/exercise-form';

/** `/exercise-form?id=…` edits a custom exercise; `?name=…` pre-fills a new one. */
export default function ExerciseFormRoute() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  return <ExerciseFormScreen id={id} name={name} />;
}
