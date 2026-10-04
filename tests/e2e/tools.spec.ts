import { test, expect } from "@playwright/test";

test("tool center is a separate view and additions appear on home", async ({ page }) => {
  await page.goto("/");
  const bar = page.getByRole("region", { name: "首页工具栏" });
  await expect(bar.getByRole("button", { name: "OpenClaw" })).toBeVisible();
  await bar.getByRole("button", { name: "添加工具" }).click();
  await expect(page.getByRole("heading", { name: "工具中心" })).toBeVisible();
  await expect(bar).toHaveCount(0);
  await page.getByRole("button", { name: "添加翻译到首页" }).click();
  await page.getByRole("button", { name: "返回首页" }).click();
  await expect(page.getByRole("button", { name: "首页", exact: true })).toBeFocused();
  await expect(bar.getByRole("button", { name: "翻译" })).toBeVisible();
  await page.reload();
  await expect(bar.getByRole("button", { name: "翻译" })).toBeVisible();
});

test("tool pages and long demo content stay within narrow viewports", async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1024 : 844 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: "添加工具" })).toBeVisible();
    await page.getByRole("button", { name: "添加工具" }).click();
    await page.getByRole("button", { name: "预览 翻译" }).click();
    await page.getByRole("textbox", { name: "待翻译文本" }).fill("长文本".repeat(120));
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "文件" }).click();
    await page.getByLabel("选择文档").setInputFiles({ name: `${"长文件名".repeat(30)}.txt`, mimeType: "text/plain", buffer: Buffer.from("demo") });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "返回首页" }).click();
    await expect(page.getByRole("button", { name: "添加工具" })).toBeVisible();
  }
});
