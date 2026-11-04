import Toast from '@/components/ui/common/Toast';
import React, { useCallback, useMemo, useState } from 'react';

// Same shape as useAlert: call showToast("...") and render {ToastComponent} once in the screen.
// Showing a new toast while one is up replaces it and restarts the timer.
export function useToast(duration = 3200) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(null);
    // Re-set on the next frame so an identical message still restarts the animation
    requestAnimationFrame(() => setMessage(text));
  }, []);

  const hideToast = useCallback(() => setMessage(null), []);

  const ToastComponent = useMemo(
    () => <Toast message={message} onHide={hideToast} duration={duration} />,
    [message, hideToast, duration],
  );

  return { showToast, hideToast, ToastComponent };
}
