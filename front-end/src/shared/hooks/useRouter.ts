import { useRouter as useExpoRouter } from 'expo-router';
import { useRef, useCallback } from 'react';

/**
 * Custom hook to prevent double navigation during rapid clicks
 * This fixes the issue where screens might be pushed onto the stack multiple times
 */
export function useRouter() {
  const router = useExpoRouter();
  const isNavigating = useRef(false);

  const push = useCallback((href: any, options?: any) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push(href, options);
    // 500ms delay to reset the navigation lock
    setTimeout(() => {
      isNavigating.current = false;
    }, 600);
  }, [router]);

  const replace = useCallback((href: any, options?: any) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.replace(href, options);
    setTimeout(() => {
      isNavigating.current = false;
    }, 600);
  }, [router]);

  const back = useCallback(() => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.back();
    setTimeout(() => {
      isNavigating.current = false;
    }, 600);
  }, [router]);

  return {
    ...router,
    push,
    replace,
    back,
  };
}
