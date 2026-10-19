import { useSession } from '@/lib/session';
import { WorkoutFeedScreen } from '@/screens/workouts/workout-feed';

export default function WorkoutsTab() {
  const userId = useSession((s) => s.user?.id);
  // The tabs are mounted only while signed in.
  return userId ? <WorkoutFeedScreen userId={userId} /> : null;
}
