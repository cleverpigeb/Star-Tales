/**
 * 从 public/backgrounds/fantasy-panorama-source.png 生成多宽度 WebP，
 * 供横屏下按视口宽度切换（object-fit: cover 由前端样式负责）。
 */
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dir = join(root, "public", "backgrounds");
const candidates = [
  join(dir, "fantasy-panorama-source.png"),
  join(dir, "fantasy-panorama-source.jpg"),
  join(dir, "fantasy-panorama-source.jpeg"),
];
const src = candidates.find((p) => existsSync(p));
if (!src) {
  console.error(
    "Missing source image. Place fantasy-panorama-source.png (or .jpg) in public/backgrounds/",
  );
  process.exit(1);
}

/** 与 ResponsiveFantasyBackground 中 media 断点对应的目标宽度 */
const sizes = [
  { file: "bg-1280.webp", width: 1280 },
  { file: "bg-1920.webp", width: 1920 },
  { file: "bg-2560.webp", width: 2560 },
  { file: "bg-3200.webp", width: 3200 },
];

for (const { file, width } of sizes) {
  const out = join(dir, file);
  await sharp(src)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(out);
  console.log("wrote", file);
}
