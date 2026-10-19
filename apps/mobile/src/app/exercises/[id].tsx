import { useLocalSearchParams } from 'expo-router';

import { ExerciseDetailScreen } from '@/screens/exercises/exercise-detail';

export default function ExerciseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseDetailScreen id={id} />;
}
