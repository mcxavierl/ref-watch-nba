/**
 * Normalize La Liga nav marks to one canvas:
 * - light: red mark on solid white background
 * - dark: white mark on transparent background
 *
 * Run: npx tsx scripts/normalize-laliga-logos.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const LOGO_DIR = join(process.cwd(), "public", "logos");
const SOURCE_DIR = join(process.cwd(), "scripts", "assets", "laliga");
const CANVAS = { width: 356, height: 332 } as const;
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 } as const;

async function buildLightMark(): Promise<Buffer> {
  const redMark = await sharp(join(SOURCE_DIR, "laliga-red-transparent.png"))
    .resize(CANVAS.width, CANVAS.height, { fit: "fill" })
    .png()
    .toBuffer();

  return sharp({
    create: {
      ...CANVAS,
      channels: 4,
      background: WHITE,
    },
  })
    .composite([{ input: redMark }])
    .png()
    .toBuffer();
}

async function buildDarkMark(): Promise<Buffer> {
  return sharp(join(SOURCE_DIR, "laliga-white-transparent.png"))
    .resize(CANVAS.width, CANVAS.height, { fit: "fill" })
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  const [light, dark] = await Promise.all([buildLightMark(), buildDarkMark()]);

  writeFileSync(join(LOGO_DIR, "laliga-red.png"), light);
  writeFileSync(join(LOGO_DIR, "laliga-white.png"), dark);

  const lightMeta = await sharp(light).metadata();
  const darkMeta = await sharp(dark).metadata();
  console.log(
    `Normalized La Liga marks to ${lightMeta.width}x${lightMeta.height} (light + dark).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
