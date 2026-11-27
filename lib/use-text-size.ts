"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { isTextSize, TEXT_SIZE_STYLES, type TextSize } from "./text-size";

export type { TextSize } from "./text-size";

const STORAGE_KEY = "quiz-text-size";
const CHANGE_EVENT = "quiz-text-size-change";
const ORDER: TextSize[] = ["normal", "large", "xlarge"];

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
 * useSyncExternalStore. The root font-size is applied inline as well as via
 * the `data-text-size` attribute, so it works immediately even when a stale
 * CSS cache delays the stylesheet rules.
 */
export function useTextSize() {
  const textSize = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const root = document.documentElement;
    if (textSize === "normal") {
      delete root.dataset.textSize;
      root.style.removeProperty("font-size");
    } else {
      root.dataset.textSize = textSize;
      root.style.fontSize = TEXT_SIZE_STYLES[textSize];
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
