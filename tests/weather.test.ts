import { test, expect, vi, afterEach } from "vitest";
import { fetchCurrentWeather, freshWeather } from "../src/features/weather/api";
const city = {
  id: 1,
  name: "上海",
  country: "中国",
  admin1: "",
  latitude: 31,
  longitude: 121,
  timezone: "Asia/Shanghai",
};
afterEach(() => vi.unstubAllGlobals());
test("weather cache expires at 30 minutes and never displays invalid temperature as zero", async () => {
  const cache = {
    cityId: 1,
    temperature: 22,
    code: 0,
    isDay: true,
    fetchedAt: 100,
  };
  expect(freshWeather(cache, 1, 100 + 29 * 60000)).toBe(true);
  expect(freshWeather(cache, 1, 100 + 30 * 60000)).toBe(false);
  expect(freshWeather(cache, 2, 200)).toBe(false);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { temperature_2m: null, weather_code: 0, is_day: 1 },
      }),
    }),
  );
  await expect(
    fetchCurrentWeather(city, new AbortController().signal),
  ).rejects.toThrow();
});
