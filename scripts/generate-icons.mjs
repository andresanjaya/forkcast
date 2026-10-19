import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "assets", "logo.png");
const icons = [
  ["favicon-32.png", 32],
  ["favicon-48.png", 48],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

await Promise.all(icons.map(async ([name, size]) => {
  await sharp(source).resize(size, size).png().toFile(join(root, "public", name));
  process.stdout.write(`${name}: ${size}x${size}\n`);
}));
