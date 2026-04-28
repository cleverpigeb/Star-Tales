"use client";

import { useRef, useCallback } from "react";
import { drawParchmentTexture } from "@/lib/parchment-texture";

/**
 * Manages the full-screen parchment-texture canvas.
 *
 * Returns a stable ref-callback that sizes the canvas and draws the
 * procedural parchment texture exactly once when the element mounts.
 */
export function useParchmentTexture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef(false);

  const refCallback = useCallback((node: HTMLCanvasElement | null) => {
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current =
      node;
    if (!node || drawnRef.current) return;
    node.width = node.offsetWidth || window.innerWidth;
    node.height = node.offsetHeight || window.innerHeight;
    const ctx = node.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      drawParchmentTexture(ctx, node.width, node.height);
      drawnRef.current = true;
    }
  }, []);

  return { canvasRef, refCallback };
}
