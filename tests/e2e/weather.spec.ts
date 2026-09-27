import { test, expect } from "@playwright/test";
const cities = [
  {
    id: 1,
    name: "上海",
    admin1: "上海",
    country: "中国",
    latitude: 31,
    longitude: 121,
    timezone: "Asia/Shanghai",
  },
  {
    id: 2,
    name: "北京",
    admin1: "北京",
    country: "中国",
    latitude: 40,
    longitude: 116,
    timezone: "Asia/Shanghai",
  },
];
test("weather remains idle until configured, switches cities, caches and handles failure", async ({
  page,
}) => {
  let forecasts = 0;
  await page.route("**/geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: { results: cities } }),
  );
  await page.route("**/api.open-meteo.com/**", (route) => {
    forecasts++;
    return route.fulfill({
      json: {
        current: {
          temperature_2m:
            new URL(route.request().url()).searchParams.get("latitude") === "31"
              ? 24
              : 18,
          weather_code: 0,
          is_day: 1,
        },
      },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "设置天气城市" }),
  ).toBeVisible();
  expect(forecasts).toBe(0);
  await page.getByRole("button", { name: "设置天气城市" }).click();
  await page.getByLabel("查找城市").fill("上海");
  await page.getByRole("button", { name: /上海 上海/ }).click();
  await expect(
    page.getByRole("button", { name: "更换天气城市" }),
  ).toContainText("上海 24°C");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "更换天气城市" }),
  ).toContainText("24°C");
  expect(forecasts).toBe(1);
  await page.getByRole("button", { name: "更换天气城市" }).click();
  await page.getByLabel("查找城市").fill("北京");
  await page.getByRole("button", { name: /北京 北京/ }).click();
  await expect(
    page.getByRole("button", { name: "更换天气城市" }),
  ).toContainText("北京 18°C");
  await page.route("**/api.open-meteo.com/**", (route) =>
    route.abort("failed"),
  );
  await page.evaluate(() => {
    const key = "personal-tab:weather";
    const cache = JSON.parse(localStorage.getItem(key)!);
    cache.fetchedAt = 0;
    localStorage.setItem(key, JSON.stringify(cache));
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "更换天气城市" }),
  ).toContainText("更新失败");
  await expect(
    page.getByRole("button", { name: "更换天气城市" }),
  ).toContainText("18°C");
  await page.getByRole("button", { name: "更换天气城市" }).click();
  await page.getByRole("button", { name: "关闭天气" }).click();
  await expect(
    page.getByRole("button", { name: "设置天气城市" }),
  ).toBeVisible();
});

test("late city A response never overwrites selected city B", async ({
  page,
}) => {
  let finishA!: () => Promise<void>;
  let requestedA!: () => void;
  const requestA = new Promise<void>((resolve) => {
    requestedA = resolve;
  });
  await page.route("**/geocoding-api.open-meteo.com/**", (route) =>
    route.fulfill({ json: { results: cities } }),
  );
  await page.route("**/api.open-meteo.com/**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("latitude") === "31") {
      finishA = async () => {
        try {
          await route.fulfill({
            json: {
              current: { temperature_2m: 99, weather_code: 0, is_day: 1 },
            },
          });
        } catch {}
      };
      requestedA();
    } else
      await route.fulfill({
        json: { current: { temperature_2m: 18, weather_code: 3, is_day: 1 } },
      });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "设置天气城市" }).click();
  await page.getByLabel("查找城市").fill("上海");
  await page.getByRole("button", { name: /上海 上海/ }).click();
  await requestA;
  await page.getByRole("button", { name: "更换天气城市" }).click();
  await page.getByLabel("查找城市").fill("北京");
  await page.getByRole("button", { name: /北京 北京/ }).click();
  await expect(
    page.getByRole("button", { name: "更换天气城市" }),
  ).toContainText("北京 18°C");
  await finishA();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "更换天气城市" }),
  ).toContainText("北京 18°C");
});
