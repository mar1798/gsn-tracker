import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderRouter } from 'expo-router/testing-library';
import type { ComponentType, ReactNode } from 'react';

/** Renders screens inside a test router with a fresh query client (no retries, no cache). */
export function renderScreens(
  routes: Record<string, ComponentType>,
  { initialUrl = '/' }: { initialUrl?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const wrap = (Screen: ComponentType) =>
    function Wrapped() {
      return (
        <QueryClientProvider client={queryClient}>
          <Screen />
        </QueryClientProvider>
      );
    };
  const wrapped = Object.fromEntries(Object.entries(routes).map(([k, v]) => [k, wrap(v)]));
  return renderRouter(wrapped, { initialUrl });
}

export function Noop(): ReactNode {
  return null;
}
