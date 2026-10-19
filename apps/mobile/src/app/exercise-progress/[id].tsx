import { useLocalSearchParams } from 'expo-router';

import { ExerciseProgressScreen } from '@/screens/progress/exercise-progress';

export default function ExerciseProgressRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseProgressScreen id={id} />;
}
