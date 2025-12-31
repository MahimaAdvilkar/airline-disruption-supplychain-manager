import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000, // 1 hour for fairly static data like airlines
      gcTime: 24 * 60 * 60 * 1000, // keep cache for 24 hours
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1, // avoid excessive retries
    },
  },
});
