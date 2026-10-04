import { test, expect } from "@playwright/test";

test("homepage owns site editing and confirmed deletion without category labels", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "网站管理", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("把日常，放在顺手的地方。", { exact: true }),
  ).toHaveCount(0);
  const sites = page.getByRole("region", { name: "快捷网站", exact: true });
  await expect(sites.locator("small")).toHaveCount(0);
  await expect(
    sites.getByRole("button", { name: "Google", exact: true }),
  ).toBeVisible();
  await expect(
    sites.getByRole("button", { name: "删除 Google", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "整理网站", exact: true }).click();
  await sites.getByRole("button", { name: "编辑 Google", exact: true }).click();
  await expect(page.getByLabel("网站名称")).toHaveValue("Google");
  await page.keyboard.press("Escape");
  page.once("dialog", (dialog) => dialog.dismiss());
  await sites.getByRole("button", { name: "删除 Google", exact: true }).click();
  await expect(
    sites.getByRole("button", { name: "Google", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await sites.getByRole("button", { name: "删除 Google", exact: true }).click();
  await expect(
    sites.getByRole("button", { name: "Google", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    sites.getByRole("button", { name: "Google", exact: true }),
  ).toHaveCount(0);
});

test("group tabs switch sites and support keyboard navigation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "整理网站", exact: true }).click();
  await page.getByRole("button", { name: "新增分组", exact: true }).click();
  await page.getByLabel("分组名称").fill("工作");
  await page.getByRole("button", { name: "创建分组", exact: true }).click();
  const tabs = page.getByRole("tablist", { name: "网站分组" });
  const work = tabs.getByRole("tab", { name: "工作" });
  await expect(work).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("这个分组还没有网站")).toBeVisible();
  await work.focus();
  await page.keyboard.press("ArrowLeft");
  const common = tabs.getByRole("tab", { name: "常用" });
  await expect(common).toBeFocused();
  await expect(common).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(work).toBeFocused();
  await page.keyboard.press("Home");
  await expect(common).toBeFocused();
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("normal mode pointer drag persists without opening a site", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const sites = page.getByRole("region", { name: "快捷网站", exact: true });
  const from = await sites
    .getByRole("button", { name: "Google", exact: true })
    .boundingBox();
  const to = await sites
    .getByRole("button", { name: "YouTube", exact: true })
    .boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + 45);
  await page.mouse.down();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + 45, { steps: 12 });
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
  expect(context.pages()).toHaveLength(1);
  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await page.reload();
  await expect(sites.locator("[data-site-id]").first()).toHaveAttribute(
    "data-site-id",
    "seed-youtube",
  );
});

test("keyboard sorting and ordinary clicks remain available", async ({
  page,
}) => {
  await page.goto("/");
  const google = page
    .getByRole("region", { name: "快捷网站", exact: true })
    .getByRole("button", { name: "Google", exact: true });
  await google.focus();
  await page.keyboard.press("Space");
  await expect(google).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({
      hasText: "seed-google was moved over droppable area seed-google",
    }),
  ).toBeAttached();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("status").filter({
      hasText: "seed-google was moved over droppable area seed-youtube",
    }),
  ).toBeAttached();
  await page.keyboard.press("Space");
  await expect(google).not.toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("personal-tab:shortcut:seed-google")!)
            .order,
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByLabel("网站打开方式").selectOption("new");
  await page.keyboard.press("Escape");
  await page.context().route("https://www.google.com/**", (route) =>
    route.fulfill({ status: 200, body: "ok" }),
  );
  const popup = page.waitForEvent("popup");
  await google.click();
  const opened = await popup;
  await expect.poll(() => opened.url()).toContain("google.com");
  await opened.close();
  const keyboardPopup = page.waitForEvent("popup", { timeout: 3000 });
  await google.press("Enter");
  const keyboardOpened = await keyboardPopup;
  await expect.poll(() => keyboardOpened.url()).toContain("google.com");
  await keyboardOpened.close();
});

test("touch swipe scrolls, while a long press sorts", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const session = await context.newCDPSession(page);
  const google = page.locator('[data-site-id="seed-google"] > button').first();
  const box = await google.boundingBox();
  const x = box!.x + box!.width / 2,
    y = box!.y + box!.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 5; step++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - step * 25 }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(30);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("personal-tab:shortcut:seed-google")!)
          .order,
    ),
  ).toBe(0);
  await page.reload();
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  const start = await google.boundingBox();
  const target = await page
    .locator('[data-site-id="seed-youtube"] > button')
    .first()
    .boundingBox();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start!.x + start!.width / 2, y: start!.y + 45 }],
  });
  await expect(google).toHaveAttribute("aria-pressed", "true");
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: target!.x + target!.width / 2, y: target!.y + 45 }],
  });
  await expect(
    page.getByRole("status").filter({
      hasText: "seed-google was moved over droppable area seed-youtube",
    }),
  ).toBeAttached();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("personal-tab:shortcut:seed-google")!)
            .order,
      ),
    )
    .toBe(1);
  await context.close();
});

test("edit corner controls fit desktop and narrow screens without layout shifts", async ({
  page,
}) => {
  for (const width of [1440, 894, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const google = page.locator('[data-site-id="seed-google"]');
    const before = await google.boundingBox();
    await page.getByRole("button", { name: "整理网站", exact: true }).click();
    const after = await google.boundingBox();
    expect(after).toEqual(before);
    const edit = await google
      .getByRole("button", { name: "编辑 Google", exact: true })
      .boundingBox();
    const remove = await google
      .getByRole("button", { name: "删除 Google", exact: true })
      .boundingBox();
    const logo = await google.locator("span").first().boundingBox();
    expect(edit!.x + edit!.width).toBeLessThanOrEqual(remove!.x);
    expect(edit!.y).toBe(logo!.y);
    expect(remove!.y).toBe(logo!.y);
    expect(edit!.x + edit!.width).toBeGreaterThan(logo!.x);
    expect(edit!.x).toBeLessThan(logo!.x);
    expect(remove!.x).toBeLessThan(logo!.x + logo!.width);
    expect(remove!.x + remove!.width).toBeGreaterThan(
      logo!.x + logo!.width,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/qa/home-edit-${width}.png`,
      fullPage: true,
    });
  }
});

test("compact sites have larger icons and borderless circular hover actions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "整理网站", exact: true }).click();
  const tile = page.locator('[data-site-id="seed-google"]');
  const icon = tile.locator("img");
  await expect(icon).toHaveAttribute("width", "48");
  const box = await tile.boundingBox();
  expect(box!.width).toBe(78);
  expect(box!.height).toBeLessThanOrEqual(110);
  const rowGap = await tile.evaluate((el) =>
    parseFloat(getComputedStyle(el.parentElement!).rowGap),
  );
  expect(rowGap).toBeLessThanOrEqual(12);
  for (const name of ["编辑 Google", "删除 Google"]) {
    const action = tile.getByRole("button", { name, exact: true });
    await page.mouse.move(0, 0);
    await expect(action).toHaveCSS("border-top-width", "0px");
    await expect(action).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(action).toHaveCSS("border-radius", "50%");
    const before = await action.boundingBox();
    await action.hover();
    await expect
      .poll(() => action.evaluate((el) => getComputedStyle(el).backgroundColor))
      .toMatch(/^rgba\(.+, 0\.[1-9]\d*\)$/);
    expect(await action.boundingBox()).toEqual(before);
  }
  await page.screenshot({
    path: "docs/qa/home-edit-hover.png",
    fullPage: true,
  });
});

test("homepage uses compact vertical spacing around AI and content modules", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    const spacing = await page.evaluate(() => {
      const content = document.querySelector("main > div");
      const body = content?.lastElementChild;
      const aiTools = content?.querySelector('section[aria-label="首页工具栏"]');
      const leftColumn = document.querySelector('[data-column="left"]');
      const grid = leftColumn?.parentElement;
      const columns = leftColumn;
      return {
        bodyPaddingTop: parseFloat(getComputedStyle(body!).paddingTop),
        aiMarginTop: parseFloat(getComputedStyle(aiTools!).marginTop),
        aiMarginBottom: parseFloat(getComputedStyle(aiTools!).marginBottom),
        contentWidth: content!.getBoundingClientRect().width,
        mainWidth: document.querySelector("main")!.getBoundingClientRect().width,
        gridColumnGap: parseFloat(getComputedStyle(grid!).columnGap),
        columnGap: parseFloat(getComputedStyle(columns!).gap),
      };
    });
    expect(spacing.bodyPaddingTop).toBe(0);
    expect(spacing.aiMarginTop).toBe(15);
    expect(spacing.aiMarginBottom).toBe(15);
    expect(spacing.contentWidth / spacing.mainWidth).toBeGreaterThanOrEqual(
      width <= 540 ? 0.9 : 0.93,
    );
    if (width > 950) {
      expect(spacing.gridColumnGap).toBeLessThanOrEqual(20);
      expect(spacing.columnGap).toBeLessThanOrEqual(20);
    }
  }
});
