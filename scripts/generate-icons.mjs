// Renders the PWA / Apple touch icons from public/icons/icon.svg. Run: node scripts/generate-icons.mjs
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const svg = await readFile("public/icons/icon.svg");
const mark = (size) => sharp(svg, { density: 72 * (size / 32) }).resize(size, size).png();

await mark(192).toFile("public/icons/icon-192.png");
await mark(512).toFile("public/icons/icon-512.png");
await mark(180).flatten({ background: "#55622f" }).toFile("public/icons/apple-touch-icon.png");
// Maskable: full-bleed background with the mark inside the safe zone.
const inner = await mark(360).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#55622f" } }).composite([{ input: inner, gravity: "centre" }]).png().toFile("public/icons/icon-maskable-512.png");
console.log("icons generated");
