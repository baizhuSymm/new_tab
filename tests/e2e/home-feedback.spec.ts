import { expect, test } from "@playwright/test";

test("the last website tile opens the add website form", async ({ page }) => {
  await page.goto("/");
  const sites = page.getByRole("region", { name: "快捷网站" });
  const add = sites.getByRole("button", { name: "在网站列表末尾添加网站" });
  await expect(add).toBeVisible();
  const lastSite = sites.getByRole("button", { name: "豆瓣", exact: true });
  const lastBox = await lastSite.boundingBox();
  const addBox = await add.boundingBox();
  expect(lastBox).not.toBeNull();
  expect(addBox).not.toBeNull();
  expect(addBox!.y > lastBox!.y || (addBox!.y === lastBox!.y && addBox!.x > lastBox!.x)).toBe(true);
  await add.click();
  await expect(page.getByRole("dialog", { name: "添加网站" })).toBeVisible();
});

test("browser history preview does not show old app-local recent records", async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 668 });
  await page.goto("/");
  await page.evaluate(() => {
    for (const [index, name] of ["示例甲", "示例乙"].entries()) {
      localStorage.setItem(`personal-tab:recent:feedback-${index}`, JSON.stringify({
        id: `feedback-${index}`,
        name,
        url: `https://example.com/${index}`,
        icon: "",
        openedAt: Date.now() - index * 60000,
      }));
    }
  });
  await page.reload();
  const history = page.getByRole("region", { name: "浏览历史" });
  await expect(history.getByText("浏览历史仅在浏览器扩展中显示")).toBeVisible();
  await expect(history.getByText("示例甲")).toHaveCount(0);
  await expect(history.getByText("示例乙")).toHaveCount(0);
});
