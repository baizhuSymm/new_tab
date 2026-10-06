import { test, expect } from "@playwright/test";

test("homepage keeps the requested fixed module columns", async ({ page }) => {
  await page.goto("/");
  const left = page.locator('[data-column="left"]');
  const right = page.locator('[data-column="right"]');
  await expect(left.locator('[data-module="shortcuts"]')).toBeVisible();
  await expect(left.locator('[data-module="recent"]')).toBeVisible();
  await expect(right.locator('[data-module="schedule"]')).toBeVisible();
  await expect(right.locator('[data-module="tasks"]')).toBeVisible();
  await expect(right.locator('[data-module="notes"]')).toBeVisible();
  await expect(page.locator('[data-column="full"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "日程管理", exact: true })).toBeVisible();
});

test("fixed columns remain within the viewport at desktop and mobile widths", async ({ page }) => {
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("component manager hides, restores, reorders within columns, and cancels", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "编辑布局" }).click();
  const right = page.locator('[data-column="right"]');
  await expect(right.locator('[data-module="schedule"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "日程管理位置" })).toHaveCount(0);
  await page.getByRole("button", { name: "隐藏日程管理" }).click();
  await expect(right.locator('[data-module="schedule"]')).toHaveCount(0);
  await page.getByRole("button", { name: "显示日程管理" }).click();
  await expect(right.locator('[data-module="schedule"]')).toBeVisible();
  await page.getByRole("button", { name: "上移快速记录" }).click();
  await expect(right.locator('[data-module]').nth(1)).toHaveAttribute("data-module", "notes");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(right.locator('[data-module]').nth(1)).toHaveAttribute("data-module", "tasks");
  await page.getByRole("button", { name: "编辑布局" }).click();
  await page.getByRole("button", { name: "上移快速记录" }).click();
  await page.getByRole("button", { name: "保存布局" }).click();
  await expect(page.locator('[data-column="right"] [data-module]').nth(1)).toHaveAttribute("data-module", "notes");
});
