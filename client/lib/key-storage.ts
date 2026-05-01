"use client";

/**
 * Minimal session-scoped Gemini key holder.
 *
 * Lives only in `sessionStorage` (cleared when the tab closes) and is never
 * sent to next.js via cookie. The dashboard pulls it back out for each upload
 * to attach as `X-Gemini-Key`.
 *
 * If the user has opted in to server-side storage, the dashboard skips this
 * entirely and sets `use_saved_key=true` on the form.
 */

const KEY = "recallai:gemini-key";

export function saveKey(value: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, value);
}

export function getKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY);
}

export function clearKey(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
