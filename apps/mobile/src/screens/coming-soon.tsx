import { Screen, ScreenHeader } from '@/components/screen';
import { EmptyState } from '@/components/empty-state';
import type { IconName } from '@/components/icon';

/** Tabs whose screens arrive in later phases (progress: 6, exercises: 5). */
export function ComingSoonScreen({
  title,
  icon,
  message,
}: {
  title: string;
  icon: IconName;
  message: string;
}) {
  return (
    <Screen>
      <ScreenHeader title={title} />
      <EmptyState icon={icon} title="Скоро здесь" message={message} />
    </Screen>
  );
}
