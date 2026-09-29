import { test, expect } from "vitest";
import { validateImageFile } from "../src/features/wallpaper/prepareWallpaper";
import { builtinWallpapers, getWallpaperPosition } from "../src/domain/wallpapers";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
test("rejects unsupported images and oversized sources before decoding", () => {
  expect(() =>
    validateImageFile(new File(["x"], "test.svg", { type: "image/svg+xml" })),
  ).toThrow();
  expect(() =>
    validateImageFile({ type: "image/png", size: 20_000_001 } as File),
  ).toThrow();
  expect(() =>
    validateImageFile(new File(["x"], "test.png", { type: "image/png" })),
  ).not.toThrow();
});

test("bundled wallpaper library has local optimized assets and independent crop defaults", () => {
  expect(builtinWallpapers.map((item) => item.id)).toEqual(["city", "forest", "alpine"]);
  for (const wallpaper of builtinWallpapers) {
    const path = resolve(process.cwd(), "public", wallpaper.src.replace(/^\//, ""));
    expect(existsSync(path)).toBe(true);
    if (wallpaper.id !== "city") expect(statSync(path).size).toBeLessThan(1_500_000);
  }
  expect(getWallpaperPosition({ wallpaperPositions: { city: { positionX: 10, positionY: 20 } } }, "city")).toEqual({ positionX: 10, positionY: 20 });
  expect(getWallpaperPosition({ wallpaperPositions: {} }, "forest")).toEqual({ positionX: 50, positionY: 50 });
});
