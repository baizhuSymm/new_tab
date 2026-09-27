import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const source = "docs/superpowers/specs/assets/selected-concept.png";
const actual = "docs/qa/home-1487.png";
await mkdir("docs/qa", { recursive: true });
const s = await sharp(source).metadata(),
  a = await sharp(actual).metadata();
await sharp({
  create: {
    width: 2974,
    height: Math.max(s.height, a.height),
    channels: 3,
    background: "#ffffff",
  },
})
  .composite([
    { input: source, left: 0, top: 0 },
    { input: actual, left: 1487, top: 0 },
  ])
  .png()
  .toFile("docs/qa/comparison-full.png");
const crop = { left: 130, top: 405, width: 1290, height: 500 };
const left = await sharp(source).extract(crop).toBuffer(),
  right = await sharp(actual).extract(crop).toBuffer();
await sharp({
  create: { width: 2580, height: 500, channels: 3, background: "#ffffff" },
})
  .composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: 1290, top: 0 },
  ])
  .png()
  .toFile("docs/qa/comparison-modules.png");
console.log(
  JSON.stringify(
    {
      source: s,
      implementation: a,
      cssViewport: [1487, 1058],
      deviceScaleFactor: 1,
    },
    null,
    2,
  ),
);
