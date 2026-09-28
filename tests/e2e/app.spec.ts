import { test, expect, type Page } from "@playwright/test";

async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "设置", exact: true }),
  ).toBeVisible();
}
async function addTask(page: Page, title: string) {
  await page.getByRole("button", { name: "添加待办", exact: true }).click();
  await page.getByLabel("事项", { exact: true }).fill(title);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("first installation is empty, dialogs trap focus and restore it", async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByText("今天，留一点空间给自己")).toBeVisible();
  await expect(page.getByLabel("便签草稿")).toBeEmpty();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "设置" })).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "编辑布局" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "设置", exact: true }),
  ).toBeFocused();
});
test("shortcut CRUD, groups, order and persistence", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "整理网站", exact: true }).click();
  await page.getByRole("button", { name: "新增分组" }).click();
  await page.getByLabel("分组名称").fill("工作");
  await page.getByRole("button", { name: "创建分组" }).click();
  await page.getByRole("button", { name: "添加网站", exact: true }).click();
  await page.getByLabel("网站名称").fill("我的项目");
  await page.getByLabel("网址", { exact: true }).fill("example.com");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /我的项目/ }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "编辑 我的项目", exact: true })
    .click();
  await page.getByLabel("网站名称").fill("更新的项目");
  await page
    .getByRole("combobox", { name: "分组", exact: true })
    .selectOption("default");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await page.getByLabel("网站分组").selectOption("default");
  await expect(
    page.getByRole("button", { name: /更新的项目/ }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /更新的项目/ }).first(),
  ).toBeVisible();
});
test("tasks sync between two tabs and survive reload; completion can be undone", async ({
  page,
  context,
}) => {
  await ready(page);
  const other = await context.newPage();
  await ready(other);
  await addTask(page, "测试任务 A");
  await addTask(other, "测试任务 B");
  await expect(
    page.getByRole("checkbox", { name: "完成 测试任务 B" }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "完成 测试任务 A" }).click();
  await page.getByRole("button", { name: "已完成 1" }).click();
  await expect(
    page.getByRole("checkbox", { name: "完成 测试任务 A" }),
  ).toBeChecked();
  await page.getByRole("checkbox", { name: "完成 测试任务 A" }).click();
  await other.reload();
  await expect(
    other.getByRole("checkbox", { name: "完成 测试任务 A" }),
  ).not.toBeChecked();
  await expect(
    other.getByRole("checkbox", { name: "完成 测试任务 B" }),
  ).toBeVisible();
});
test("draft autosaves, commits, and survives navigation without duplicate notes", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("便签草稿").fill("先写下来，再慢慢实现。");
  await expect(
    page.getByRole("region", { name: "快速记录" }).getByRole("status"),
  ).toHaveText("已保存");
  await page.reload();
  await expect(page.getByLabel("便签草稿")).toHaveValue(
    "先写下来，再慢慢实现。",
  );
  await page.getByRole("button", { name: "保存为便签" }).click();
  await expect(page.getByLabel("便签草稿")).toBeEmpty();
  await page.getByRole("button", { name: "便签管理", exact: true }).click();
  await expect(
    page.getByText("先写下来，再慢慢实现。", { exact: true }),
  ).toHaveCount(1);
});
test("layout cancellation, save, hidden restore and keyboard sorting", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "编辑布局", exact: true }).click();
  await page.getByLabel("待办事项位置").selectOption("left");
  await expect(
    page.locator("[data-column=left] [data-module=tasks]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(
    page.locator("[data-column=right] [data-module=tasks]"),
  ).toBeVisible();
  await page.getByRole("button", { name: "编辑布局", exact: true }).click();
  await page.getByRole("button", { name: "隐藏快速记录" }).click();
  await page.getByRole("button", { name: "保存布局" }).click();
  await page.reload();
  await expect(page.getByLabel("便签草稿")).toHaveCount(0);
  await page.getByRole("button", { name: "编辑布局", exact: true }).click();
  await page.getByRole("button", { name: "显示快速记录" }).click();
  await page.getByRole("button", { name: "拖动快速记录" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "保存布局" }).click();
  await expect(page.getByLabel("便签草稿")).toBeVisible();
});
test("wallpaper rejects corrupt files and accepts real image; offline edits persist", async ({
  page,
  context,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "壁纸", exact: true }).click();
  await page.getByLabel("上传壁纸").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert")).toContainText("损坏");
  await page
    .getByLabel("上传壁纸")
    .setInputFiles("public/wallpapers/city-panorama.png");
  await expect(page.getByRole("button", { name: "本地图片" })).toBeVisible();
  await page.getByRole("button", { name: "应用壁纸" }).click();
  await expect(page.locator("header > img")).toHaveAttribute(
    "src",
    /^data:image\/webp/,
  );
  await context.setOffline(true);
  await addTask(page, "离线也能记录");
  await expect(
    page.getByRole("checkbox", { name: "完成 离线也能记录" }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "完成 离线也能记录" }),
  ).toBeVisible();
});
test("IME enter does not submit, local search keyboard opens a real target in a new tab", async ({
  page,
  context,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByLabel("网站打开方式").selectOption("new");
  await page.keyboard.press("Escape");
  const input = page.getByRole("combobox", { name: "搜索或输入网址" });
  await input.fill("github");
  await input.dispatchEvent("compositionstart");
  await input.press("Enter");
  expect(context.pages()).toHaveLength(1);
  await input.dispatchEvent("compositionend");
  await input.press("ArrowDown");
  const popup = context.waitForEvent("page");
  await input.press("Enter");
  const opened = await popup;
  await expect.poll(() => opened.url()).toContain("github.com");
  await opened.close();
  await expect(
    page
      .getByRole("region", { name: "最近打开" })
      .getByRole("button", { name: /GitHub/ }),
  ).toBeVisible();
});
