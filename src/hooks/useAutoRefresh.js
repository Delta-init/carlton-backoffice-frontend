import { useEffect, useRef, useCallback } from 'react';

/**
 * Auto-refresh hook: refetches data when:
 * - Page becomes visible (user switches back to tab)
 * - After a specified interval (polling)
 */
export function useAutoRefresh(fetchFn, intervalMs = 30000) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  // Refresh on visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRef.current();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Periodic polling
  useEffect(() => {
    if (!intervalMs) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRef.current();
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}
