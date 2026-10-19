import { useLocalSearchParams } from 'expo-router';

import { WorkoutDetailScreen } from '@/screens/workouts/workout-detail';

export default function WorkoutRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutDetailScreen id={id} />;
}
