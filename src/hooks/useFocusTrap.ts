import { useEffect, useRef } from 'react';

/**
 * Custom React Hook: useFocusTrap (WCAG 2.1.2 Compliant)
 * 1. Automatically focuses first interactive element inside modal on open.
 * 2. Traps Tab and Shift + Tab focus strictly within modal bounds.
 * 3. Restores focus to the triggering element on modal close.
 */
export const useFocusTrap = <T extends HTMLElement>(isOpen: boolean) => {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Remember triggering element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // 2. Focus first input / button inside modal container
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }, 50);

    // 3. Trap Tab / Shift+Tab focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element, wrap to last
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      // 4. Restore focus on close
      setTimeout(() => {
        previouslyFocusedRef.current?.focus();
      }, 50);
    };
  }, [isOpen]);

  return containerRef;
};
