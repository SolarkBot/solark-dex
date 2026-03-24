"use client";

import { useSyncExternalStore } from "react";

const COLOR_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
  mediaQuery.addEventListener("change", callback);

  return () => {
    mediaQuery.removeEventListener("change", callback);
  };
}

function getSnapshot() {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches;
}

function getServerSnapshot() {
  return true;
}

export function usePrefersDarkMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
