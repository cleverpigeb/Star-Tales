/**
 * Deterministic 2D noise primitives used by parchment-texture generation
 * and the fire-burn simulation.
 */

export function hash2d(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise2d(x: number, y: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const tx = fx * fx * (3 - 2 * fx);
  const ty = fy * fy * (3 - 2 * fy);
  const a = hash2d(ix, iy),
    b = hash2d(ix + 1, iy),
    c = hash2d(ix, iy + 1),
    d = hash2d(ix + 1, iy + 1);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

export function fbm2d(x: number, y: number, octaves = 4): number {
  let v = 0,
    a = 0.5,
    f = 1;
  for (let o = 0; o < octaves; o++) {
    v += a * noise2d(x * f, y * f);
    a *= 0.5;
    f *= 2;
  }
  return v;
}
