"use client";

import { useState, useEffect } from "react";

const BREAKPOINTS = [
  { minWidth: 2560, src: "/backgrounds/bg-3200.webp" },
  { minWidth: 1920, src: "/backgrounds/bg-2560.webp" },
  { minWidth: 1280, src: "/backgrounds/bg-1920.webp" },
] as const;

const DEFAULT_BG = "/backgrounds/bg-1280.webp";

interface PreloadState {
  bgSrc: string;
  isLoaded: boolean;
}

/**
 * Selects and preloads the appropriately-sized background image based
 * on the viewport width.  Returns `isLoaded: true` after a double-rAF
 * following the image load, ensuring compositing layers are stable
 * before the unroll animation starts.
 */
export function useBackgroundPreload() {
  const [state, setState] = useState<PreloadState>({
    bgSrc: "",
    isLoaded: false,
  });

  useEffect(() => {
    const width = window.innerWidth;
    const match = BREAKPOINTS.find((bp) => width >= bp.minWidth);
    const src = match?.src ?? DEFAULT_BG;

    const img = new Image();
    img.src = src;

    const onReady = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setState({ bgSrc: src, isLoaded: true });
        });
      });
    };

    img.onload = onReady;
    img.onerror = onReady;
    if (img.complete) onReady();
  }, []);

  return state;
}
