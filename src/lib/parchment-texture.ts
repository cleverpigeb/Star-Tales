import { fbm2d } from "./noise";

const BLOTCHES: readonly [number, number, number][] = [
  [0.3, 0.2, 0.15],
  [0.7, 0.6, 0.12],
  [0.2, 0.8, 0.18],
  [0.8, 0.3, 0.1],
  [0.5, 0.5, 0.2],
  [0.15, 0.45, 0.13],
  [0.85, 0.75, 0.11],
];

const FOLD_LINES: readonly [number, number, number, number][] = [
  [0.15, 0, 0.25, 1],
  [0.55, 0, 0.45, 1],
  [0.85, 0, 0.75, 1],
  [0, 0.3, 1, 0.35],
  [0, 0.65, 1, 0.7],
];

export function drawParchmentTexture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const cx = w / 2,
    cy = h / 2;

  ctx.fillStyle = "#c4a265";
  ctx.fillRect(0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const px = imgData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const grain =
        fbm2d(x * 0.008, y * 0.008, 6) * 0.5 +
        fbm2d(x * 0.03, y * 0.03, 3) * 0.2 +
        fbm2d(x * 0.1, y * 0.1, 2) * 0.08;

      const dx = (x - cx) / cx,
        dy = (y - cy) / cy;
      const vignette = 1 - (dx * dx + dy * dy) * 0.35;

      let stain = 0;
      for (const [bx, by, br] of BLOTCHES) {
        const sdx = (x / w - bx) / br,
          sdy = (y / h - by) / br;
        const d2 = sdx * sdx + sdy * sdy;
        if (d2 < 1) stain += (1 - d2) * 0.15;
      }

      const brightness = (grain * 0.7 + 0.65) * vignette - stain;
      px[idx] = Math.max(
        0,
        Math.min(255, 196 * brightness + (grain - 0.5) * 30),
      );
      px[idx + 1] = Math.max(
        0,
        Math.min(255, 162 * brightness + (grain - 0.5) * 20),
      );
      px[idx + 2] = Math.max(
        0,
        Math.min(255, 101 * brightness + (grain - 0.5) * 10),
      );
      px[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#3a2010";
  ctx.lineWidth = 1.5;
  for (const [x1, y1, x2, y2] of FOLD_LINES) {
    ctx.beginPath();
    ctx.moveTo(x1 * w, y1 * h);
    ctx.lineTo(x2 * w, y2 * h);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const warmGrad = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    cy,
    Math.hypot(cx, cy),
  );
  warmGrad.addColorStop(0, "rgba(210,180,120,0.08)");
  warmGrad.addColorStop(0.6, "rgba(160,120,60,0.05)");
  warmGrad.addColorStop(1, "rgba(60,30,10,0.15)");
  ctx.fillStyle = warmGrad;
  ctx.fillRect(0, 0, w, h);
}
