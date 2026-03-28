/* eslint-disable no-console -- this module is the only allowed place for diagnostic logging */

/**
 * Centralized error logging. In production, avoid emitting raw error objects
 * (they may include internal details). Logs only in __DEV__.
 */
export function logAppError(scope: string, error: unknown): void {
  if (!__DEV__) return;
  console.error(`[NicedayCarwash:${scope}]`, error);
}
