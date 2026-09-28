import { test, expect } from "@playwright/test";
test("pointer sorting persists site order and module moves; outside drop cancels", async ({
  page,
}) => {
  await page.goto("/");
  const from = await page
    .getByRole("button", { name: "Google", exact: true })
    .boundingBox();
  const to = await page
    .getByRole("button", { name: "YouTube", exact: true })
    .boundingBox();
  await page.mouse.move(from!.x + 10, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(to!.x + 10, to!.y + 10, { steps: 12 });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("personal-tab:shortcut:seed-google")!)
            .order,
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "首页", exact: true }).click();
  await page.getByRole("button", { name: "编辑布局", exact: true }).click();
  const handle = await page
    .getByRole("button", { name: "拖动待办事项" })
    .boundingBox();
  const target = await page.locator("[data-column=left]").boundingBox();
  await page.mouse.move(handle!.x + 15, handle!.y + 15);
  await page.mouse.down();
  await page.mouse.move(target!.x + 60, target!.y + 60, { steps: 14 });
  await page.mouse.up();
  await expect(
    page.locator("[data-column=left] [data-module=tasks]"),
  ).toBeVisible();
  const moved = await page
    .getByRole("button", { name: "拖动待办事项" })
    .boundingBox();
  await page.mouse.move(moved!.x + 12, moved!.y + 12);
  await page.mouse.down();
  await page.mouse.move(10, 10, { steps: 14 });
  await page.mouse.up();
  await expect(
    page.locator("[data-column=left] [data-module=tasks]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "保存布局" }).click();
  await expect(page.getByRole("button", { name: "保存布局" })).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator("[data-column=left] [data-module=tasks]"),
  ).toBeVisible();
});
test("quota failure retains task form and does not create a task", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "添加待办", exact: true }).click();
  await page.getByLabel("事项", { exact: true }).fill("这条内容必须保留");
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("personal-tab:task:"))
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return set.call(this, key, value);
    };
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("事项", { exact: true })).toHaveValue(
    "这条内容必须保留",
  );
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "保存失败",
  );
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) =>
        k.startsWith("personal-tab:task:"),
      ),
    ),
  ).toHaveLength(0);
});
test("mobile drawers and layout controls fit; clock preference persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.clock.install({ time: new Date("2026-09-26T16:42:00+08:00") });
  await page.goto("/");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByLabel("时间格式").selectOption("12");
  await page.screenshot({ path: "docs/qa/settings-mobile.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("time")).toHaveText("04:42");
  await page.getByRole("button", { name: "编辑布局", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/qa/layout-mobile.png", fullPage: true });
});
