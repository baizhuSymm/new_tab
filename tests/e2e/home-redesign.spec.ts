import { expect, test } from "@playwright/test";

test("website management shows sites from every saved group without tabs", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("personal-tab:group:work", JSON.stringify({ id: "work", name: "工作", order: 1 }));
    localStorage.setItem("personal-tab:shortcut:work", JSON.stringify({
      id: "work", name: "内部文档", url: "https://example.com/", icon: "", groupId: "work", order: 0, updatedAt: 1,
    }));
  });
  await page.reload();
  const sites = page.getByRole("region", { name: "快捷网站" });
  await expect(sites.getByRole("heading", { name: "网站管理" })).toBeVisible();
  await expect(sites.getByRole("tablist")).toHaveCount(0);
  await expect(sites.getByRole("button", { name: "Google", exact: true })).toBeVisible();
  await expect(sites.getByRole("button", { name: "内部文档", exact: true })).toBeVisible();
});

test("today and later tasks share the homepage task list", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    for (const [id, title, dueDate] of [
      ["today", "今天处理", "2000-01-01"],
      ["later", "以后处理", "2099-01-01"],
    ]) {
      localStorage.setItem(`personal-tab:task:${id}`, JSON.stringify({
        id, title, dueDate, description: "", dueTime: null, completedAt: null, order: 0, updatedAt: 1,
      }));
    }
  });
  await page.reload();
  const tasks = page.getByRole("region", { name: "待办事项" });
  await expect(tasks.getByRole("heading", { name: "待办事项" })).toBeVisible();
  await expect(tasks.getByRole("tablist")).toHaveCount(0);
  await expect(tasks.getByRole("button", { name: "今天处理", exact: true })).toBeVisible();
  await expect(tasks.getByRole("button", { name: "以后处理", exact: true })).toBeVisible();
});

test("quick note previews the three most recently saved notes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    for (let index = 1; index <= 4; index++) {
      localStorage.setItem(`personal-tab:note:${index}`, JSON.stringify({
        id: String(index), text: `记录 ${index}`, createdAt: index, updatedAt: index,
      }));
    }
  });
  await page.reload();
  const notes = page.getByRole("region", { name: "快速记录" });
  for (const index of [4, 3, 2]) await expect(notes.getByText(`记录 ${index}`)).toBeVisible();
  await expect(notes.getByText("记录 1")).toHaveCount(0);
});

test("wallpaper covers the search bar and website tiles stay compact", async ({ page }) => {
  await page.setViewportSize({ width: 776, height: 612 });
  await page.goto("/");
  const hero = await page.locator("header > img").boundingBox();
  const search = await page.getByRole("search").boundingBox();
  expect(search!.y + search!.height).toBeLessThanOrEqual(hero!.y + hero!.height);
  const sites = page.getByRole("region", { name: "快捷网站" });
  const tile = sites.locator("[data-site-id]").first();
  expect((await tile.boundingBox())!.width).toBeLessThanOrEqual(72);
  await expect(sites.locator("[data-site-id]").first().locator("img")).toHaveAttribute("width", "40");
  expect(await tile.evaluate((element) => getComputedStyle(element.parentElement!).display)).toBe("flex");
});

test("task add button sits immediately beside its heading", async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 668 });
  await page.goto("/");
  const tasks = page.getByRole("region", { name: "待办事项" });
  const titleRight = await tasks.getByRole("heading", { name: "待办事项" }).evaluate((heading) => {
    const range = document.createRange();
    range.selectNodeContents(heading);
    return range.getBoundingClientRect().right;
  });
  const addButton = await tasks.getByRole("button", { name: "添加待办" }).boundingBox();
  expect(addButton!.x - titleRight).toBeLessThanOrEqual(24);
});

test("selected-day schedule text remains visible without hovering", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("personal-tab:schedule:visible", JSON.stringify({
      id: "visible", title: "可见日程", startAt: new Date().toISOString(),
      endAt: null, description: "日程说明", color: "green", order: 0, updatedAt: Date.now(),
    }));
  });
  await page.reload();
  const schedule = page.getByRole("region", { name: "日程管理" });
  const event = schedule.getByRole("button", { name: /^可见日程/ });
  await expect(event).toBeVisible();
  expect(await event.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
});

test("homepage columns have equal desktop widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const left = await page.locator('[data-column="left"]').boundingBox();
  const right = await page.locator('[data-column="right"]').boundingBox();
  expect(Math.abs(left!.width - right!.width)).toBeLessThanOrEqual(1);
});

test("schedule panel shows selected date beside a calendar and starts on today", async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 668 });
  await page.goto("/");
  const dates = await page.evaluate(() => {
    const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const save = (id: string, date: Date) => localStorage.setItem(`personal-tab:schedule:${id}`, JSON.stringify({
      id, title: id, startAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10).toISOString(),
      endAt: null, description: null, color: "green", order: 0, updatedAt: Date.now(),
    }));
    save("今日日程", today);
    save("明日日程", tomorrow);
    return { today: format(today), tomorrow: format(tomorrow) };
  });
  await page.reload();
  const panel = page.getByRole("region", { name: "日程管理" });
  const list = panel.getByRole("region", { name: "所选日期日程" });
  const calendar = panel.getByRole("region", { name: "日历" });
  const listBox = await list.boundingBox();
  const calendarBox = await calendar.boundingBox();
  expect(calendarBox!.x).toBeGreaterThan(listBox!.x);
  await expect(calendar.getByRole("button", { name: `选择 ${dates.today}` })).toHaveAttribute("aria-pressed", "true");
  await expect(list.getByRole("button", { name: /^今日日程/ })).toBeVisible();
  await expect(list.getByRole("button", { name: /^明日日程/ })).toHaveCount(0);
  if (dates.today.slice(0, 7) !== dates.tomorrow.slice(0, 7)) {
    await calendar.getByRole("button", { name: "下个月" }).click();
  }
  await calendar.getByRole("button", { name: `选择 ${dates.tomorrow}` }).click();
  await expect(list.getByRole("button", { name: /^明日日程/ })).toBeVisible();
  await expect(list.getByRole("button", { name: /^今日日程/ })).toHaveCount(0);
});

test("unfinished and completed tasks stay in separate side-by-side lists", async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 668 });
  await page.goto("/");
  await page.evaluate(() => {
    for (const [id, completedAt] of [["未办任务", null], ["已办任务", Date.now()]] as const) {
      localStorage.setItem(`personal-tab:task:${id}`, JSON.stringify({
        id, title: id, description: "", dueDate: null, dueTime: null,
        completedAt, order: 0, updatedAt: Date.now(),
      }));
    }
  });
  await page.reload();
  const tasks = page.getByRole("region", { name: "待办事项" });
  const active = tasks.getByRole("region", { name: "未完成事项" });
  const done = tasks.getByRole("region", { name: "已完成事项" });
  expect((await done.boundingBox())!.x).toBeGreaterThan((await active.boundingBox())!.x);
  await expect(active.getByRole("button", { name: "未办任务", exact: true })).toBeVisible();
  await expect(done.getByRole("button", { name: "已办任务", exact: true })).toBeVisible();
  await active.getByRole("checkbox", { name: "完成 未办任务" }).click();
  await expect(done.getByRole("button", { name: "未办任务", exact: true })).toBeVisible();
  await done.getByRole("checkbox", { name: "完成 未办任务" }).click();
  await expect(active.getByRole("button", { name: "未办任务", exact: true })).toBeVisible();
});

test("schedule list stays within calendar height, scrolls, and has a bottom divider", async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 668 });
  await page.goto("/");
  const today = await page.evaluate(() => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    for (let index = 0; index < 12; index++) {
      localStorage.setItem(`personal-tab:schedule:overflow-${index}`, JSON.stringify({
        id: `overflow-${index}`, title: `日程 ${index}`,
        startAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), index + 8).toISOString(),
        endAt: null, description: null, color: "green", order: index, updatedAt: Date.now(),
      }));
    }
    return date;
  });
  await page.reload();
  const panel = page.getByRole("region", { name: "日程管理" });
  const agenda = panel.getByRole("region", { name: "所选日期日程" });
  const calendar = panel.getByRole("region", { name: "日历" });
  const board = agenda.locator("xpath=..");
  const boardBox = (await board.boundingBox())!;
  const calendarGrid = (await calendar.locator(":scope > div").last().boundingBox())!;
  expect(boardBox.y + boardBox.height).toBeLessThanOrEqual(calendarGrid.y + calendarGrid.height + 16);
  expect(await agenda.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await agenda.evaluate((element) => { element.scrollTop = element.scrollHeight; return element.scrollTop; })).toBeGreaterThan(0);
  await expect(agenda.locator(`time[datetime="${today}"]`)).toHaveCount(0);
  expect(await board.evaluate((element) => getComputedStyle(element).borderBottomWidth)).toBe("1px");
});

test("empty task columns use compact vertical space", async ({ page }) => {
  await page.setViewportSize({ width: 724, height: 668 });
  await page.goto("/");
  const active = page.getByRole("region", { name: "未完成事项" });
  const board = active.locator("xpath=..");
  expect((await board.boundingBox())!.height).toBeLessThan(160);
});
