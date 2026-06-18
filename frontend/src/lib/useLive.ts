'use client';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from './auth';

// Polling query that only fires once authenticated (avoids stray 401s pre-login).
export function useLive<T>(key: string, fn: () => Promise<T>, interval = 2000) {
  const { user } = useAuth();
  return useQuery({ queryKey: [key], queryFn: fn, refetchInterval: interval, enabled: !!user });
}
