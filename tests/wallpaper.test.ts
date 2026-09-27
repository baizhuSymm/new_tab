import { test, expect } from "vitest";
import { validateImageFile } from "../src/features/wallpaper/prepareWallpaper";
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
