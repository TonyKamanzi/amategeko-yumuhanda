"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type TextSize = "normal" | "large" | "xlarge";

const STORAGE_KEY = "quiz-text-size";
const CHANGE_EVENT = "quiz-text-size-change";
const ORDER: TextSize[] = ["normal", "large", "xlarge"];

function isTextSize(value: string | null): value is TextSize {
  return value === "normal" || value === "large" || value === "xlarge";
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/** Current preference from localStorage, defaulting to the normal size. */
function getSnapshot(): TextSize {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isTextSize(stored)) return stored;
  } catch {
    // Storage may be blocked — fall through to the default.
  }
  return "normal";
}

function getServerSnapshot(): TextSize {
  return "normal";
}

/**
 * Text-size preference with localStorage persistence, exposed via
 * useSyncExternalStore. The <html data-text-size> attribute is kept in sync
 * so the rem-based Tailwind utilities scale together with the text.
 */
export function useTextSize() {
  const textSize = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (textSize === "normal") {
      delete document.documentElement.dataset.textSize;
    } else {
      document.documentElement.dataset.textSize = textSize;
    }
  }, [textSize]);

  const cycle = useCallback(() => {
    const next = ORDER[(ORDER.indexOf(getSnapshot()) + 1) % ORDER.length];
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage may be blocked — the event still applies the in-memory value.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { textSize, cycle };
}
