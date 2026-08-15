import { useEffect, useRef } from 'react';

/**
 * Custom React Hook: useIdleTimer
 * Tracks user activity (mousemove, keydown, click, scroll, touchstart).
 * Automatically triggers `onIdle` callback after 15 minutes (900,000 ms) of inactivity.
 */
interface UseIdleTimerProps {
  timeoutMs?: number; // Default: 15 minutes (900,000 ms)
  onIdle: () => void;
  enabled?: boolean;
}

export const useIdleTimer = ({
  timeoutMs = 15 * 60 * 1000, // 15 minutes
  onIdle,
  enabled = true,
}: UseIdleTimerProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        onIdle();
      }, timeoutMs);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'click', 'scroll', 'touchstart'];

    const handleUserActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [enabled, timeoutMs, onIdle]);
};
