import { test, expect, type Page } from "@playwright/test";
import { seedShortcuts } from "../../src/domain/defaults";

async function seed(page: Page) {
  const now = new Date("2026-09-26T09:42:00+08:00").getTime();
  await page.clock.install({ time: now });
  await page.goto("/");
  await expect(page.getByLabel("便签草稿")).toBeVisible();
  await page.evaluate(
    ({ now, sites }) => {
      const put = (key: string, value: unknown) =>
        localStorage.setItem(`personal-tab:${key}`, JSON.stringify(value));
      const titles = [
        "团队周会",
        "回复重要邮件",
        "产品方案讨论",
        "整理本周工作总结",
      ];
      const desc = [
        "海报评审与下周规划",
        "包括合作方与用户反馈",
        "新功能优先级与排期",
        "准备下周汇报材料",
      ];
      titles.forEach((title, i) =>
        put(`task:qa-${i}`, {
          id: `qa-${i}`,
          title,
          description: desc[i],
          dueDate: "2026-09-26",
          dueTime: ["10:00", "11:30", "14:00", "16:30"][i],
          completedAt: null,
          order: i,
          updatedAt: now,
        }),
      );
      for (const [i, site] of sites.entries())
        put(`recent:qa-${i}`, {
          id: `qa-${i}`,
          name: site.name,
          url: site.url,
          icon: site.icon,
          openedAt: now - (i + 1) * 120000,
        });
      const settings = JSON.parse(
        localStorage.getItem("personal-tab:settings")!,
      );
      settings.city = {
        id: 1796236,
        name: "上海",
        country: "中国",
        admin1: "上海",
        latitude: 31.22,
        longitude: 121.46,
        timezone: "Asia/Shanghai",
      };
      put("settings", settings);
      put("weather", {
        cityId: 1796236,
        temperature: 24,
        code: 0,
        isDay: true,
        fetchedAt: now,
      });
    },
    {
      now,
      sites: [
        seedShortcuts[3],
        seedShortcuts[2],
        seedShortcuts[5],
        seedShortcuts[1],
        seedShortcuts[10],
        seedShortcuts[12],
        seedShortcuts[15],
      ],
    },
  );
  await page.reload();
  await expect(page.getByText("团队周会", { exact: true })).toBeVisible();
}
for (const [width, height] of [
  [1487, 1058],
  [1440, 1024],
  [1366, 768],
  [1024, 768],
  [390, 844],
  [320, 844],
]) {
  test(`responsive screenshot ${width}x${height}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await seed(page);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await expect(
      page.getByRole("button", { name: "设置", exact: true }),
    ).toBeVisible();
    await expect(page.locator("header > img")).toBeVisible();
    expect(
      await page
        .locator("header > img")
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(1000);
    await page.screenshot({
      path: `docs/qa/home-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
