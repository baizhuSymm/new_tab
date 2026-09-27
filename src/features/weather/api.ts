import type { City, WeatherCache } from "../../domain/types";
async function getJson(url: URL, signal: AbortSignal) {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    credentials: "omit",
  });
  if (!response.ok) throw Error(`天气服务暂不可用 (${response.status})`);
  return response.json();
}
export function freshWeather(
  cache: WeatherCache | null,
  cityId: number,
  now = Date.now(),
) {
  return Boolean(
    cache &&
    cache.cityId === cityId &&
    now >= cache.fetchedAt &&
    now - cache.fetchedAt < 30 * 60_000,
  );
}
export async function searchCities(
  query: string,
  signal: AbortSignal,
): Promise<City[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query.trim(),
    count: "5",
    language: "zh",
    format: "json",
  }).toString();
  const data = await getJson(url, signal);
  if (data.results !== undefined && !Array.isArray(data.results))
    throw Error("城市查询返回了无效数据");
  return (data.results ?? [])
    .filter(
      (r: Record<string, unknown>) =>
        Number.isFinite(r.id) &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude) &&
        typeof r.name === "string" &&
        typeof r.timezone === "string",
    )
    .map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country ?? "",
      admin1: r.admin1 ?? "",
      timezone: r.timezone,
    }));
}
export async function fetchCurrentWeather(
  city: City,
  signal: AbortSignal,
): Promise<WeatherCache> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: "temperature_2m,weather_code,is_day",
    temperature_unit: "celsius",
    timezone: "auto",
  }).toString();
  const data = await getJson(url, signal),
    current = data.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isFinite(current.weather_code) ||
    ![0, 1].includes(current.is_day)
  )
    throw Error("天气数据不完整");
  return {
    cityId: city.id,
    temperature: current.temperature_2m,
    code: current.weather_code,
    isDay: current.is_day === 1,
    fetchedAt: Date.now(),
  };
}
export function weatherLabel(code: number) {
  if (code === 0) return "晴";
  if (code <= 3) return "多云";
  if (code <= 48) return "雾";
  if (code <= 67) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "阵雨";
  if (code <= 86) return "阵雪";
  return "雷雨";
}
