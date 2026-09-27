import { test, expect, chromium } from "@playwright/test";
import { resolve } from "node:path";
import { mkdtemp, mkdir } from "node:fs/promises";
test("MV3 new tab override, cross-tab storage, restart and CSP", async () => {
  await mkdir(".browser-profile", { recursive: true });
  const profile = await mkdtemp(resolve(".browser-profile/test-"));
  const extension = resolve("dist");
  const launch = () =>
    chromium.launchPersistentContext(profile, {
      channel: "chromium",
      executablePath: process.env.EXTENSION_CHROMIUM_PATH || undefined,
      headless: true,
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
      viewport: { width: 1440, height: 1024 },
    });
  let context = await launch();
  let url = "";
  try {
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("chrome://newtab/");
    await page.waitForURL(/^chrome-extension:\/\//);
    url = page.url();
    await expect(
      page.getByRole("button", { name: "设置", exact: true }),
    ).toBeVisible();
    const other = await context.newPage();
    await other.goto(url);
    for (const [target, title] of [
      [page, "扩展任务 A"],
      [other, "扩展任务 B"],
    ] as const) {
      await target
        .getByRole("button", { name: "添加待办", exact: true })
        .click();
      await target.getByLabel("事项", { exact: true }).fill(title);
      await target
        .getByRole("dialog")
        .getByRole("button", { name: "保存", exact: true })
        .click();
    }
    await expect(
      page.getByRole("checkbox", { name: "完成 扩展任务 B" }),
    ).toBeVisible();
    await page.screenshot({ path: "docs/qa/extension.png" });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
  context = await launch();
  try {
    const page = await context.newPage();
    await page.goto(url);
    await expect(
      page.getByRole("checkbox", { name: "完成 扩展任务 A" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "完成 扩展任务 B" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
