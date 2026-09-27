import { test, expect, vi, afterEach } from "vitest";
import { webStorage } from "../src/platform/web-storage";
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
test("multi-key web storage writes roll back on a later quota failure", async () => {
  const storage = webStorage();
  await storage.write({ settings: { positionX: 50 }, wallpaper: "old" });
  const original = Storage.prototype.setItem;
  let calls = 0;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    if (++calls === 2) throw Error("quota");
    original.call(this, key, value);
  });
  await expect(
    storage.write({ wallpaper: "new", settings: { positionX: 80 } }),
  ).rejects.toThrow("quota");
  expect(await storage.readAll()).toEqual({
    settings: { positionX: 50 },
    wallpaper: "old",
  });
});

test("rollback restores successful writes in reverse order under a real size constraint", async () => {
  const storage = webStorage();
  await storage.write({ a: "a".repeat(60), b: "b".repeat(10) });
  const original = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
    this: Storage,
    key,
    value,
  ) {
    const total =
      Object.keys(this).reduce(
        (n, k) => n + (k === key ? 0 : this.getItem(k)!.length),
        0,
      ) + value.length;
    if (total > 80) throw Error("quota");
    original.call(this, key, value);
  });
  await expect(
    storage.write({ a: "x".repeat(10), b: "y".repeat(50), c: "z".repeat(30) }),
  ).rejects.toThrow();
  expect(await storage.readAll()).toEqual({
    a: "a".repeat(60),
    b: "b".repeat(10),
  });
});
