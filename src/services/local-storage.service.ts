/**
 * Keys used by the application in localStorage.
 * Use these constants instead of raw strings to avoid typos and enable
 * easy refactoring.
 */
export const STORAGE_KEYS = {
  LANGUAGE: "language",
  THEME: "theme", // managed by next-themes; exposed here for discoverability
} as const;

/**
 * Reads a value from localStorage.
 * Returns `defaultValue` when the key is absent, the value cannot be parsed,
 * or when running server-side (no `window`).
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Writes a value to localStorage.
 * Silently no-ops when running server-side or when storage is unavailable
 * (e.g. private-browsing quota exceeded).
 */
export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — ignore silently.
  }
}

/**
 * Removes a key from localStorage.
 */
export function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
