"use client";

import { useEffect, useRef, useState } from "react";
import { hash2d, fbm2d } from "@/lib/noise";

/* =================================================================
   Parchment burn-reveal — fire eats through the background image,
   revealing the full-screen parchment layer underneath.

   Single canvas, per-pixel rendering:
   ─ Unburned cells → transparent (background shows through)
   ─ Active fire cells → flame / ember / char colors
   ─ Burned-through cells → sampled from the real parchment canvas
   ================================================================= */

// ── Constants ─────────────────────────────────────────────────────

let W = 900,
  H = 1280;

const CELL = 4;
let GW = Math.ceil(W / CELL);
let GH = Math.ceil(H / CELL);
let GCELLS = GW * GH;

function initBurnDimensions(w: number, h: number) {
  W = w;
  H = h;
  GW = Math.ceil(W / CELL);
  GH = Math.ceil(H / CELL);
  GCELLS = GW * GH;
}

// Scorch-mark edge band: cells within this many grid units of the
// burnable-region boundary receive a noise-modulated dark stain on
// their final parchment color, simulating how real fire leaves an
// irregular scorched halo along the torn edge.
const EDGE_R = 11;

// Fire terminates on CONDITION (all cells burnt through), not on a timer.
// MAX_DURATION is only a safety cap that should never normally be reached.
const MAX_DURATION = 30;
const FINISH_GRACE = 0.55; // extra time after state.done for phases to settle
const FLAME_DURATION = 0.45;
const HEAT_RATE = 23;
const DIAG_FACTOR = 1 / Math.SQRT2;

// Burn-edge visual phases (seconds since cell ignition)
const PHASE_FLAME = 0.18;
const PHASE_EMBER = 0.40;
const PHASE_CHAR = 0.70;
const PHASE_GONE = 1.10; // fully burned → show parchment

// Fire ignition start color (matches dark atmosphere so flames emerge seamlessly)
const BG_R = 16, BG_G = 12, BG_B = 24;

// ── Fire Simulation ───────────────────────────────────────────────

interface FireState {
  burnTime: Float32Array;
  heat: Float32Array;
  threshold: Float32Array;
  /** Pre-computed per-cell base propagation-speed multiplier. */
  speed: Float32Array;
  /** Per-cell distance (in grid units) to the nearest non-burnable
   *  neighbor — clamped at EDGE_R. Burnable cells with edgeDist < EDGE_R
   *  live in the scorch band and receive a darkened stain at render
   *  time. Non-burnable cells and cells far from the edge both store
   *  EDGE_R (no stain). */
  edgeDist: Float32Array;
  /** Max scorch blend weight (0…~0.8); ash RGB sampled at cell center. */
  scorchStr: Float32Array;
  scorchAshR: Float32Array;
  scorchAshG: Float32Array;
  scorchAshB: Float32Array;
  frontier: Set<number>;
  heated: Set<number>;
  done: boolean;
  /** Pixel-space bounding box of the burnable region — used to skip
   *  never-burnable pixels in the per-pixel render loop. */
  pxMinX: number;
  pxMaxX: number;
  pxMinY: number;
  pxMaxY: number;
}

function createFireState(): FireState {
  const burnTime = new Float32Array(GCELLS).fill(-1);
  const heat = new Float32Array(GCELLS);
  const threshold = new Float32Array(GCELLS);
  const speed = new Float32Array(GCELLS);

  const gcx = GW / 2;
  const gcy = GH / 2;

  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const idx = y * GW + x;
      const dx = (x - gcx) / gcx;
      const dy = (y - gcy) / gcy;

      // Ignition threshold: wide spatial variation so fire percolates
      // with highly uneven timing.
      threshold[idx] =
        0.25 + fbm2d(x * 0.055 + 1.7, y * 0.055 + 3.3, 4) * 0.5;

      // Break grid artifacts by making speed highly non-uniform at a macro scale
      // so the fire spreads wildly and irregularly in all directions until it hits the edges.
      const s1 = fbm2d(x * 0.008 + 17.3, y * 0.008 + 5.7, 4); // Large smooth regions
      const s2 = fbm2d(x * 0.04 + 7.1, y * 0.04 + 11.3, 3);
      const veinNoise = fbm2d(x * 0.012 + 4.1, y * 0.012 + 9.5, 3);
      const vein = Math.pow(Math.max(0, veinNoise - 0.3), 3) * 50; // Extreme speed channels
      const jitter = hash2d(x * 11 + 1.3, y * 13 + 2.7) - 0.5;
      
      // angle-based noise to break symmetry
      const angToCenter = Math.atan2(dy, dx);
      const angBias = fbm2d(Math.cos(angToCenter) * 1.5, Math.sin(angToCenter) * 1.5, 3);
      
      speed[idx] = Math.max(
        0.1,
        (0.1 + s1 * 3.0 + s2 * 1.0 + vein + jitter * 0.5) * (0.5 + angBias * 1.5)
      );
    }
  }

  // ── Seed ignition cluster at center ──
  const cx = Math.floor(GW / 2),
    cy = Math.floor(GH / 2);
  const frontier = new Set<number>();
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy > 6) continue;
      const idx = (cy + dy) * GW + (cx + dx);
      if (idx >= 0 && idx < GCELLS && threshold[idx] !== Infinity) {
        burnTime[idx] = 0;
        frontier.add(idx);
      }
    }
  }

  // ── Compute pixel-space bounding box of burnable cells ──
  // The irregular burnable region usually occupies only ~40-60% of the
  // canvas area; pixels outside can never turn on, so Pass 1 can skip
  // them entirely.
  let gxMin = GW, gxMax = -1, gyMin = GH, gyMax = -1;
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (threshold[y * GW + x] !== Infinity) {
        if (x < gxMin) gxMin = x;
        if (x > gxMax) gxMax = x;
        if (y < gyMin) gyMin = y;
        if (y > gyMax) gyMax = y;
      }
    }
  }
  const pxMinX = Math.max(0, gxMin * CELL);
  const pxMaxX = Math.min(W, (gxMax + 1) * CELL);
  const pxMinY = Math.max(0, gyMin * CELL);
  const pxMaxY = Math.min(H, (gyMax + 1) * CELL);

  // ── Compute per-cell Euclidean distance (in grid units) to the
  //    nearest non-burnable neighbor, clamped at EDGE_R. ──
  // A simple windowed scan: for each burnable cell, check a
  // (2R+1)×(2R+1) square and record the minimum distance to any
  // non-burnable cell or out-of-bounds position. This runs once at
  // init; O(GCELLS × (2R+1)²) ≈ a few million ops, trivial.
  // Out-of-bounds is treated as non-burnable so cells near the
  // canvas edge also get scorched.
  const edgeDist = new Float32Array(GCELLS);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const idx = y * GW + x;
      if (threshold[idx] === Infinity) {
        edgeDist[idx] = 0;
        continue;
      }
      let minD = EDGE_R;
      for (let dy = -EDGE_R; dy <= EDGE_R; dy++) {
        const ny = y + dy;
        for (let dx = -EDGE_R; dx <= EDGE_R; dx++) {
          const d = Math.hypot(dx, dy);
          if (d >= minD) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) {
            minD = d;
            continue;
          }
          if (threshold[ny * GW + nx] === Infinity) {
            minD = d;
          }
        }
      }
      edgeDist[idx] = minD;
    }
  }

  const scorchStr = new Float32Array(GCELLS);
  const scorchAshR = new Float32Array(GCELLS);
  const scorchAshG = new Float32Array(GCELLS);
  const scorchAshB = new Float32Array(GCELLS);
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const idx = y * GW + x;
      if (threshold[idx] === Infinity) continue;
      const ed = edgeDist[idx];
      if (ed >= EDGE_R) continue;
      const edgeT = 1 - ed / EDGE_R;
      const pxC = x * CELL + CELL * 0.5;
      const pyC = y * CELL + CELL * 0.5;
      const n1 = fbm2d(pxC * 0.051 + x * 0.31, pyC * 0.051 + y * 0.29, 4);
      const n2 = fbm2d(pxC * 0.13 + 4.2, pyC * 0.13 - 2.8, 3);
      const n3 = fbm2d(pxC * 0.35 + 11.7, pyC * 0.35 + 1.3, 2);
      const speck = hash2d(pxC * 1.7 + x, pyC * 1.7 + y) - 0.5;
      const blot = n1 * 0.45 + n2 * 0.38 + n3 * 0.12 + speck * 0.18;
      const m = Math.pow(Math.max(0, Math.min(1, blot)), 0.72);
      scorchStr[idx] = edgeT * edgeT * (0.18 + 0.62 * m);
      scorchAshR[idx] = 42 + 28 * n2;
      scorchAshG[idx] = 22 + 18 * n1;
      scorchAshB[idx] = 10 + 12 * n3;
    }
  }

  return {
    burnTime,
    heat,
    threshold,
    speed,
    edgeDist,
    scorchStr,
    scorchAshR,
    scorchAshG,
    scorchAshB,
    frontier,
    heated: new Set(),
    done: false,
    pxMinX,
    pxMaxX,
    pxMinY,
    pxMaxY,
  };
}

const NEIGHBORS = [
  [-1, -1, DIAG_FACTOR], [0, -1, 1], [1, -1, DIAG_FACTOR],
  [-1, 0, 1], [1, 0, 1],
  [-1, 1, DIAG_FACTOR], [0, 1, 1], [1, 1, DIAG_FACTOR],
] as const;

function applyPrecomputedScorch(
  r: number,
  g: number,
  b: number,
  gIdx: number,
  sStr: Float32Array,
  ashR: Float32Array,
  ashG: Float32Array,
  ashB: Float32Array,
  scorchAmount: number
): [number, number, number] {
  const s0 = sStr[gIdx] * scorchAmount;
  if (s0 < 1e-4) return [r, g, b];
  const om = 1 - s0;
  return [
    r * om + ashR[gIdx] * s0,
    g * om + ashG[gIdx] * s0,
    b * om + ashB[gIdx] * s0,
  ];
}

/** Solid-fill a pixel rectangle in RGBA output (alpha = 255). */
function fillPixelRect(
  outPx: Uint8ClampedArray,
  w: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  r: number,
  g: number,
  b: number
) {
  for (let py = y0; py < y1; py++) {
    let pBase = (py * w + x0) * 4;
    for (let px = x0; px < x1; px++, pBase += 4) {
      outPx[pBase] = r;
      outPx[pBase + 1] = g;
      outPx[pBase + 2] = b;
      outPx[pBase + 3] = 255;
    }
  }
}

function updateFire(state: FireState, t: number, dt: number) {
  const { burnTime, heat, threshold, speed, frontier, heated } = state;

  for (const idx of frontier) {
    const x = idx % GW,
      y = (idx - x) / GW;
    if (t - burnTime[idx] > FLAME_DURATION) {
      frontier.delete(idx);
      continue;
    }
    for (const [dx, dy, factor] of NEIGHBORS) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
      const nIdx = ny * GW + nx;
      if (burnTime[nIdx] >= 0) continue;
      if (threshold[nIdx] === Infinity) continue;

      // Per-cell time-fluctuating speed: the base "conductivity" is
      // modulated by two sinusoidal waves whose phase is hashed to the
      // cell's coordinates, so nearby cells don't fluctuate in sync.
      // Instantaneous rate can swing ~5× between fast and slow moments,
      // producing a visibly ragged, non-geometric burn front.
      const phase =
        hash2d(nx * 0.41 + 1.3, ny * 0.41 + 2.7) * Math.PI * 20;
      
      // Add angle-based randomness to the spread speed so it doesn't spread uniformly
      const ang = Math.atan2(ny - GH / 2, nx - GW / 2);
      const angleNoise = fbm2d(Math.cos(ang) * 2 + t * 0.5, Math.sin(ang) * 2 - t * 0.3, 3);
      
      const raw =
        1 +
        0.5 * Math.sin(t * 1.7 + phase) +
        0.28 * Math.sin(t * 2.9 + phase * 1.4) +
        angleNoise * 1.5;
      const tVariance = Math.max(0.1, raw);

      heat[nIdx] += dt * HEAT_RATE * factor * speed[nIdx] * tVariance;
      heated.add(nIdx);
    }

    // Spot fires: occasionally throw an ember ahead to ignite a random cell further away
    // This entirely breaks the rectangular wave front and makes it spread wildly ahead.
    if (Math.random() < 0.005) {
      const jumpDist = 4 + Math.random() * 12; // jump 4 to 16 cells away
      const jumpAngle = Math.random() * Math.PI * 2;
      const jx = Math.round(x + Math.cos(jumpAngle) * jumpDist);
      const jy = Math.round(y + Math.sin(jumpAngle) * jumpDist);
      if (jx >= 0 && jx < GW && jy >= 0 && jy < GH) {
        const jIdx = jy * GW + jx;
        if (burnTime[jIdx] < 0 && threshold[jIdx] !== Infinity) {
          heat[jIdx] += dt * HEAT_RATE * speed[jIdx] * 20.0; // big burst of heat to instantly ignite
          heated.add(jIdx);
        }
      }
    }
  }

  const toIgnite: number[] = [];
  for (const idx of heated) {
    if (heat[idx] >= threshold[idx]) toIgnite.push(idx);
  }
  for (const idx of toIgnite) {
    burnTime[idx] = t;
    frontier.add(idx);
    heated.delete(idx);
  }

  if (frontier.size === 0 && heated.size === 0) state.done = true;
}

// ── Component ─────────────────────────────────────────────────────

interface ParchmentBurnProps {
  parchmentCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stage: number;
  skipCurrent: boolean;
}

export function ParchmentBurn({ parchmentCanvasRef, stage, skipCurrent }: ParchmentBurnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isBurnSkipped = useRef(false);

  const stageRef = useRef(stage);
  const skipCurrentRef = useRef(skipCurrent);

  const [size] = useState(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 900;
    const h = typeof window !== "undefined" ? window.innerHeight : 1280;
    initBurnDimensions(w, h);
    return { w, h };
  });

  useEffect(() => {
    stageRef.current = stage;
    skipCurrentRef.current = skipCurrent;
  }, [stage, skipCurrent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parchmentCanvas = parchmentCanvasRef.current;
    if (!canvas || !parchmentCanvas) return;
    const ctx = canvas.getContext("2d", {
      alpha: true,
      desynchronized: true,
    })!;

    const rect = canvas.getBoundingClientRect();
    const offsetX = Math.round(rect.left);
    const offsetY = Math.round(rect.top);
    const parchCtx = parchmentCanvas.getContext("2d", {
      willReadFrequently: true,
    })!;
    const parchmentPx = parchCtx.getImageData(offsetX, offsetY, W, H).data;

    const outImg = ctx.createImageData(W, H);
    const outPx = outImg.data;

    const state = createFireState();
    let lastTime = performance.now();
    let raf: number;
    let started = false;
    let frozen = false;
    let doneAt = -1;
    let t = 0;

    function tick() {
      const now = performance.now();
      const dtRaw = (now - lastTime) / 1000;
      const dt = Math.min(dtRaw, 0.05);
      lastTime = now;

      const currentStage = stageRef.current;
      const currentSkip = skipCurrentRef.current;

      if (currentStage < 4) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (!started) {
        canvas!.style.opacity = "1";
        started = true;
      }
      if (frozen) return;

      if (currentStage === 4 && currentSkip && !isBurnSkipped.current) {
        isBurnSkipped.current = true;
        state.done = true;
        t = Math.max(t, 100); // Fast forward time so age > PHASE_GONE
        for (let i = 0; i < state.threshold.length; i++) {
          if (state.threshold[i] !== Infinity) {
            state.burnTime[i] = t - PHASE_GONE - 1;
          }
        }
        state.frontier.clear();
        state.heated.clear();
      }

      if (!isBurnSkipped.current) {
        if (!state.done && t < MAX_DURATION) updateFire(state, t, dt);
      }
      t += dt;

      // ── Pass 1: Per-pixel char / ember / parchment ──
      // This pass handles the "burnt paper" layer — the concentrated
      // char band at the burn edge with red ember glow in the cracks,
      // transitioning into the revealed parchment. The actual flames
      // (rising tongues) are drawn additively in pass 2.
      const {
        burnTime,
        scorchStr,
        scorchAshR,
        scorchAshG,
        scorchAshB,
        pxMinX,
        pxMaxX,
        pxMinY,
        pxMaxY,
      } = state;
      outPx.fill(0);

      const gx0 = Math.floor(pxMinX / CELL);
      const gx1 = Math.ceil(pxMaxX / CELL);
      const gy0 = Math.floor(pxMinY / CELL);
      const gy1 = Math.ceil(pxMaxY / CELL);

      for (let gy = gy0; gy < gy1; gy++) {
        const py0 = gy * CELL;
        const pyStart = Math.max(py0, pxMinY);
        const pyEnd = Math.min(py0 + CELL, pxMaxY);
        if (pyStart >= pyEnd) continue;

        for (let gx = gx0; gx < gx1; gx++) {
          const gIdx = gy * GW + gx;
          if (burnTime[gIdx] < 0) continue;

          const px0 = gx * CELL;
          const pxStart = Math.max(px0, pxMinX);
          const pxEnd = Math.min(px0 + CELL, pxMaxX);
          if (pxStart >= pxEnd) continue;

          const age = t - burnTime[gIdx];

          if (age < PHASE_FLAME) {
            const p = age / PHASE_FLAME;
            const r = BG_R + (85 - BG_R) * p;
            const g = BG_G + (24 - BG_G) * p;
            const b = BG_B + (8 - BG_B) * p;
            fillPixelRect(outPx, W, pxStart, pxEnd, pyStart, pyEnd, r, g, b);
          } else if (age < PHASE_EMBER) {
            const p = (age - PHASE_FLAME) / (PHASE_EMBER - PHASE_FLAME);
            const flicker =
              0.78 + 0.22 * Math.sin(t * 8 + hash2d(gx, gy) * 20);
            const r0 = 85,
              g0 = 24,
              b0 = 8;
            const r1 = 50,
              g1 = 14,
              b1 = 5;
            const r = (r0 + (r1 - r0) * p) * flicker;
            const g = (g0 + (g1 - g0) * p) * flicker;
            const b = (b0 + (b1 - b0) * p) * flicker;
            fillPixelRect(outPx, W, pxStart, pxEnd, pyStart, pyEnd, r, g, b);
          } else if (age < PHASE_CHAR) {
            const p = (age - PHASE_EMBER) / (PHASE_CHAR - PHASE_EMBER);
            const pxC = gx * CELL + CELL * 0.5;
            const pyC = gy * CELL + CELL * 0.5;
            const glowNoise = fbm2d(pxC * 0.07, pyC * 0.07, 2);
            const crackEmber = Math.max(0, glowNoise - 0.55) * 2.4;
            const emberFlicker =
              0.6 + 0.4 * Math.sin(t * 6 + hash2d(gx * 1.2 + 0.4, gy * 1.2 + 0.4) * 15);
            const emberStrength = crackEmber * emberFlicker * (1 - p * 0.35);
            const baseR = 50 + (10 - 50) * p;
            const baseG = 14 + (4 - 14) * p;
            const baseB = 5 + (2 - 5) * p;
            const r = Math.min(255, baseR + 205 * emberStrength);
            const g = Math.min(255, baseG + 45 * emberStrength);
            const b = Math.min(255, baseB + 8 * emberStrength);
            fillPixelRect(outPx, W, pxStart, pxEnd, pyStart, pyEnd, r, g, b);
          } else {
            const scorchEase =
              age < PHASE_GONE
                ? Math.max(
                    0,
                    Math.min(
                      1,
                      ((age - PHASE_CHAR) / (PHASE_GONE - PHASE_CHAR) - 0.58) /
                        0.42
                    )
                  )
                : 1;

            // Refined ember texture on the left and right sides of the screen
            const pxC = gx * CELL + CELL * 0.5;
            const pyC = gy * CELL + CELL * 0.5;
            
            // Only apply ember effect outside the central welcome block (e.g. > 300px from center)
            const distFromCenter = Math.abs(pxC - W / 2);
            let emberIntensity = 0;
            
            if (distFromCenter > 300) {
              // Create a smooth, textured ember glow
              const emberNoise = fbm2d(pxC * 0.015 + 8.1, pyC * 0.015 - 2.4, 4);
              if (emberNoise > 0.55) {
                const fade = Math.min(1, (distFromCenter - 300) / 100);
                const pulse = 0.7 + 0.3 * Math.sin(t * 3 + hash2d(gx * 0.5, gy * 0.5) * 10);
                emberIntensity = Math.pow((emberNoise - 0.55) * 2.5, 1.5) * fade * pulse;
              }
            }

            for (let py = pyStart; py < pyEnd; py++) {
              const row = py * W * 4;
              for (let px = pxStart; px < pxEnd; px++) {
                const pIdx = row + px * 4;
                if (age < PHASE_GONE) {
                  const p = (age - PHASE_CHAR) / (PHASE_GONE - PHASE_CHAR);
                  let r = 10 + (parchmentPx[pIdx] - 10) * p;
                  let g = 4 + (parchmentPx[pIdx + 1] - 4) * p;
                  let b = 2 + (parchmentPx[pIdx + 2] - 2) * p;
                  [r, g, b] = applyPrecomputedScorch(
                    r,
                    g,
                    b,
                    gIdx,
                    scorchStr,
                    scorchAshR,
                    scorchAshG,
                    scorchAshB,
                    scorchEase
                  );
                  outPx[pIdx] = Math.max(0, Math.min(255, r));
                  outPx[pIdx + 1] = Math.max(0, Math.min(255, g));
                  outPx[pIdx + 2] = Math.max(0, Math.min(255, b));
                  outPx[pIdx + 3] = 255;
                } else {
                  let r = parchmentPx[pIdx];
                  let g = parchmentPx[pIdx + 1];
                  let b = parchmentPx[pIdx + 2];
                  
                  if (emberIntensity > 0) {
                    // Refined reddish-gold glowing texture
                    r = Math.min(255, r + 180 * emberIntensity);
                    g = Math.min(255, g + 60 * emberIntensity);
                    b = Math.min(255, b + 10 * emberIntensity);
                  }

                  [r, g, b] = applyPrecomputedScorch(
                    r,
                    g,
                    b,
                    gIdx,
                    scorchStr,
                    scorchAshR,
                    scorchAshG,
                    scorchAshB,
                    1
                  );
                  outPx[pIdx] = Math.max(0, Math.min(255, r));
                  outPx[pIdx + 1] = Math.max(0, Math.min(255, g));
                  outPx[pIdx + 2] = Math.max(0, Math.min(255, b));
                  outPx[pIdx + 3] = 255;
                }
              }
            }
          }
        }
      }

      // ── Pass 2: Rising flame tongues from active frontier cells ──
      // For each cell that's currently flaming, we emit a flickering
      // upward tongue. Cells whose upward neighbors are unburned (the
      // advancing top edge of the burn) produce tall, visible tongues;
      // cells on side/bottom edges of the radial burn produce short
      // glows that blend into the char rim. Contributions are additively
      // composited onto pass-1 pixels (transparent bg, char, or parchment)
      // to simulate the emissive light of real fire.
      const activeFrontier = state.frontier;
      for (const idx of activeFrontier) {
        const gx = idx % GW;
        const gy = (idx - gx) / GW;
        const age = t - burnTime[idx];
        if (age > FLAME_DURATION) continue;

        // Count the unburned cells directly above → max flame height.
        let openAbove = 0;
        for (let k = 1; k <= 18; k++) {
          if (gy - k < 0) break;
          const nIdx = (gy - k) * GW + gx;
          if (burnTime[nIdx] < 0) openAbove++;
          else break;
        }

        const intensity = Math.max(0, 1 - age / FLAME_DURATION);
        const baseX = gx * CELL + CELL / 2;
        const baseY = gy * CELL + CELL * 0.5;

        const seed = hash2d(gx * 0.37, gy * 0.41);

        // ── Spatial amplitude field (the "loud vs quiet" map) ──
        // Two drifting fbm layers define regions of tall tongues and
        // regions of nearly-extinguished ones. The (± t) drift terms
        // make the pattern evolve over time, so any given cell cycles
        // through loud and quiet moments rather than being fixed.
        const amp1 = fbm2d(
          gx * 0.04 + t * 0.35,
          gy * 0.04 - t * 0.28,
          2
        );
        const amp2 = fbm2d(
          gx * 0.11 - t * 0.12,
          gy * 0.11 + t * 0.18,
          2
        );
        const spatialAmp = amp1 * 1.35 + amp2 * 0.45;

        // Sharp "puffs": rare surges where a tongue briefly towers.
        const burst =
          Math.pow(Math.max(0, Math.sin(seed * 92 + t * 2.6)), 6) * 1.9;

        // Sharp "dips": rare moments where the tongue collapses to
        // almost nothing.
        const dip =
          Math.pow(
            Math.max(0, Math.sin(seed * 67 + t * 1.8 + 2.1)),
            8
          ) * 0.85;

        const amplitude = Math.max(0.05, spatialAmp + burst - dip);

        // High-frequency flicker on top of the amplitude field.
        const fk1 = 0.5 + 0.5 * Math.sin(t * 11 + seed * 45);
        const fk2 = 0.5 + 0.5 * Math.sin(t * 17 + seed * 28 + 1.7);
        const flicker = 0.55 + 0.3 * fk1 + 0.15 * fk2;

        const heightScale = amplitude * flicker;

        // Base 15px glow + up to ~64px when open sky above (before
        // amplitude multiplier — puffs can push tongues far taller,
        // which is what we want).
        const openBonus = Math.min(openAbove, 16) * CELL;
        const maxH = 15 + openBonus;
        const flameHeight = maxH * heightScale * intensity;
        if (flameHeight < 1.2) continue;

        for (let dy = 0; dy < flameHeight; dy++) {
          const pyI = Math.floor(baseY - dy);
          if (pyI < 0) break;
          if (pyI >= H) continue;

          const p = dy / flameHeight; // 0 at base → 1 at tip

          // Horizontal sway: two octaves, amplitude grows with height
          const swayPhase = t * 5 + seed * 10;
          const sway =
            (Math.sin(swayPhase + p * 5) +
              0.4 * Math.sin(swayPhase * 1.7 + p * 11)) *
            p *
            6;

          // Width tapers base → tip
          const widthAtP = (CELL + 1.8) * (1 - p * 0.78) + 0.5;

          // Color gradient: deep red → orange → yellow → pale white tip
          let cr: number, cg: number, cb: number, ca: number;
          if (p < 0.12) {
            const q = p / 0.12;
            cr = 40 + (210 - 40) * q;
            cg = 8 + (60 - 8) * q;
            cb = 2 + (10 - 2) * q;
            ca = 0.25 + 0.75 * q;
          } else if (p < 0.5) {
            const q = (p - 0.12) / 0.38;
            cr = 210 + (255 - 210) * q;
            cg = 60 + (165 - 60) * q;
            cb = 10 + (35 - 10) * q;
            ca = 1;
          } else if (p < 0.82) {
            const q = (p - 0.5) / 0.32;
            cr = 255;
            cg = 165 + (235 - 165) * q;
            cb = 35 + (150 - 35) * q;
            ca = 1 - q * 0.15;
          } else {
            const q = (p - 0.82) / 0.18;
            cr = 255;
            cg = 235 + (252 - 235) * q;
            cb = 150 + (220 - 150) * q;
            ca = 0.85 * (1 - q);
          }
          ca *= intensity;

          const maxDx = Math.ceil(widthAtP);
          for (let dx = -maxDx; dx <= maxDx; dx++) {
            const pxI = Math.round(baseX + dx + sway);
            if (pxI < 0 || pxI >= W) continue;

            const dn = Math.abs(dx) / widthAtP;
            if (dn >= 1) continue;
            const falloff = (1 - dn) * (1 - dn);
            const a = ca * falloff;
            if (a < 0.02) continue;

            const pIdx2 = (pyI * W + pxI) * 4;
            const curA = outPx[pIdx2 + 3];
            const baseR = curA > 0 ? outPx[pIdx2] : BG_R;
            const baseG = curA > 0 ? outPx[pIdx2 + 1] : BG_G;
            const baseB = curA > 0 ? outPx[pIdx2 + 2] : BG_B;
            outPx[pIdx2] = Math.min(255, baseR + cr * a);
            outPx[pIdx2 + 1] = Math.min(255, baseG + cg * a);
            outPx[pIdx2 + 2] = Math.min(255, baseB + cb * a);
            outPx[pIdx2 + 3] = 255;
          }
        }
      }

      ctx.putImageData(outImg, 0, 0);

      // Condition-based termination: once the fire has reached every
      // burnable cell (state.done is set when frontier and heated are
      // both empty), wait a short grace period for the final char→
      // parchment fades to play out, then freeze. The MAX_DURATION
      // branch is only a safety cap that should not normally fire.
      if (state.done) {
        if (doneAt < 0) doneAt = t;
        if (t - doneAt > FINISH_GRACE) {
          frozen = true;
          return;
        }
      } else if (t >= MAX_DURATION) {
        frozen = true;
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [parchmentCanvasRef]);

  return (
    <canvas
      ref={canvasRef}
      width={size.w}
      height={size.h}
      className="absolute pointer-events-none"
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: -2,
        width: size.w,
        height: size.h,
        opacity: 0,
      }}
      aria-hidden
    />
  );
}
