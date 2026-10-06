import { test, expect } from "@playwright/test";
test("an unresolved local draft survives navigating to notes and resolving the conflict", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByLabel("便签草稿").fill("这是我的本地内容");
  await page.evaluate(() => {
    localStorage.setItem(
      "personal-tab:draft",
      JSON.stringify({
        id: "remote",
        text: "别的标签页内容",
        updatedAt: Date.now() + 1,
      }),
    );
    window.dispatchEvent(new Event("personal-tab-change"));
  });
  await expect(page.getByRole("button", { name: "保留本地" })).toBeVisible();
  await page.getByRole("button", { name: "便签管理", exact: true }).click();
  await expect(page.getByLabel("便签草稿")).toHaveValue("这是我的本地内容");
  await page.getByRole("button", { name: "保留本地" }).click();
  await expect(page.getByText("已保存", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("便签草稿")).toHaveValue("这是我的本地内容");
});
test("future task stays visible and updates its date label at local midnight", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-26T23:59:58+08:00") });
  await page.goto("/");
  await page.getByRole("button", { name: "添加待办", exact: true }).click();
  await page.getByLabel("事项", { exact: true }).fill("午夜的任务");
  await page.getByLabel("日期", { exact: true }).fill("2026-09-27");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  const row = page.getByRole("region", { name: "未完成事项" })
    .getByRole("checkbox", { name: "完成 午夜的任务" }).locator("xpath=..");
  await expect(row).toContainText("09-27");
  await page.clock.fastForward(3000);
  await expect(row).toContainText("—");
});
