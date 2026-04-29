import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const publicDir = join(process.cwd(), "public");

function svg(size, maskable = false) {
  const fontSize = maskable ? 460 : 520;
  const y = maskable ? 595 : 620;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#FAF7F2"/>
      <text x="512" y="${y}" text-anchor="middle"
        font-family="Cormorant Garamond, Georgia, serif"
        font-size="${fontSize}" font-weight="500" fill="#1F1B16">d</text>
    </svg>
  `;
}

async function writeIcon(name, size, maskable = false) {
  const buffer = await sharp(Buffer.from(svg(size, maskable))).resize(size, size).png().toBuffer();
  await writeFile(join(publicDir, name), buffer);
}

await Promise.all([
  writeIcon("icon-192.png", 192),
  writeIcon("icon-512.png", 512),
  writeIcon("icon-maskable-512.png", 512, true),
  writeIcon("apple-touch-icon.png", 180),
]);
