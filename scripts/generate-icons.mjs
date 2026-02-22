import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const variants = [
  { svg: 'github-mark.svg', prefix: 'icon' },
  { svg: 'github-mark-light.svg', prefix: 'icon-light' },
];

const sizes = [16, 48, 128];
const outputDirs = [
  join(root, 'public/icons'),
  join(root, 'assets/icons'),
];

for (const dir of outputDirs) {
  mkdirSync(dir, { recursive: true });
}

for (const { svg: svgFile, prefix } of variants) {
  const svg = readFileSync(join(root, 'assets/icons', svgFile));
  for (const size of sizes) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    for (const dir of outputDirs) {
      const outPath = join(dir, `${prefix}-${size}.png`);
      await sharp(png).toFile(outPath);
      console.log(`wrote ${outPath}`);
    }
  }
}
