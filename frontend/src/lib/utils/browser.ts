/**
 * Browser environment utilities
 */

/**
 * Check if code is running in browser environment
 * @returns true if running in browser, false otherwise
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}
