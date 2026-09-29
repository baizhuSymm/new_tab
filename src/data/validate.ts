import type {
  AppSnapshot,
  EntityMap,
  Settings,
  Layout,
  NoteDraft,
  WallpaperAsset,
  WeatherCache,
} from "../domain/types";
import { normalizeWebUrl } from "../domain/urls";
import { validDueDate } from "../features/tasks/taskDates";
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const position = (value: unknown) =>
  finite(value) && value >= 0 && value <= 100;
export function validateEntity<K extends keyof EntityMap>(
  kind: K,
  value: unknown,
): asserts value is EntityMap[K] {
  if (!record(value) || typeof value.id !== "string" || !value.id)
    throw Error("本地记录格式不正确");
  const strings: Record<keyof EntityMap, string[]> = {
    shortcut: ["name", "url", "icon", "groupId"],
    group: ["name"],
    task: ["title", "description"],
    note: ["text"],
    recent: ["name", "url", "icon"],
    schedule: ["title"],
    wallpaper: [],
  };
  if (strings[kind].some((field) => typeof value[field] !== "string"))
    throw Error("本地记录字段不完整");
  const numbers: Record<keyof EntityMap, string[]> = {
    shortcut: ["order", "updatedAt"],
    group: ["order"],
    task: ["order", "updatedAt"],
    note: ["createdAt", "updatedAt"],
    recent: ["openedAt"],
    schedule: ["order", "updatedAt"],
    wallpaper: [],
  };
  if (numbers[kind].some((field) => !finite(value[field])))
    throw Error("本地记录数值不正确");
  if (
    (kind === "shortcut" || kind === "recent") &&
    !normalizeWebUrl(value.url as string)
  )
    throw Error("网站地址格式不正确");
  if (
    kind === "shortcut" &&
    (!(value.name as string).trim() ||
      (value.name as string).length > 80 ||
      !value.groupId)
  )
    throw Error("网站名称或分组格式不正确");
  if (
    kind === "group" &&
    (!(value.name as string).trim() || (value.name as string).length > 40)
  )
    throw Error("分组名称格式不正确");
  if (
    kind === "note" &&
    (!(value.text as string).trim() || (value.text as string).length > 10000)
  )
    throw Error("便签正文格式不正确");
  if (kind === "task") {
    if (
      [value.dueDate, value.dueTime].some(
        (v) => v !== null && typeof v !== "string",
      ) ||
      !validDueDate(
        value.dueDate as string | null,
        value.dueTime as string | null,
      ) ||
      (value.completedAt !== null && !finite(value.completedAt))
    )
      throw Error("待办日期格式不正确");
    if (
      !(value.title as string).trim() ||
      (value.title as string).length > 200 ||
      (value.description as string).length > 2000
    )
      throw Error("待办内容格式不正确");
  }
  if (kind === "schedule") {
    const event = value as unknown as EntityMap["schedule"];
    const start = Date.parse(event.startAt);
    const end = event.endAt === null ? null : Date.parse(event.endAt);
    if (
      !Number.isFinite(start) ||
      new Date(start).toISOString() !== event.startAt ||
      (event.endAt !== null && (!Number.isFinite(end) || new Date(end!).toISOString() !== event.endAt || end! <= start)) ||
      (event.description !== null && typeof event.description !== "string") ||
      !event.title.trim() || event.title.length > 200 ||
      (event.description?.length ?? 0) > 2000
    ) throw Error("日程日期或内容格式不正确");
  }
  if (kind === "wallpaper") validateWallpaper(value as unknown as WallpaperAsset);
}
export function validateSettings(s: Settings) {
  if (
    !s ||
    !["bing", "baidu", "google"].includes(s.searchEngine) ||
    !["current", "new"].includes(s.openTarget) ||
    !["12", "24"].includes(s.hourFormat) ||
    typeof s.recordRecent !== "boolean"
  )
    throw Error("设置数据格式不正确");
  if (
    !["city", "custom"].includes(s.wallpaper) ||
    !position(s.positionX) ||
    !position(s.positionY)
  )
    throw Error("壁纸设置格式不正确");
  if (
    (s.theme !== "light" && s.theme !== "dark") ||
    typeof s.wallpaperId !== "string" ||
    !record(s.wallpaperPositions) ||
    Object.values(s.wallpaperPositions).some(
      (entry) => !record(entry) || !position(entry.positionX) || !position(entry.positionY),
    )
  ) throw Error("主题或壁纸设置格式不正确");
  const c = s.city;
  if (
    c !== null &&
    (!c ||
      !finite(c.id) ||
      typeof c.name !== "string" ||
      typeof c.country !== "string" ||
      typeof c.admin1 !== "string" ||
      typeof c.timezone !== "string" ||
      !finite(c.latitude) ||
      Math.abs(c.latitude) > 90 ||
      !finite(c.longitude) ||
      Math.abs(c.longitude) > 180)
  )
    throw Error("城市数据格式不正确");
}
export function validateLayout(layout: Layout) {
  if (
    !layout ||
    layout.version !== 1 ||
    !Array.isArray(layout.modules) ||
    layout.modules.length !== 4 ||
    layout.modules.some(
      (m) =>
        !m ||
        !["shortcuts", "tasks", "notes", "recent"].includes(m.id) ||
        !["left", "right", "full"].includes(m.column) ||
        typeof m.visible !== "boolean" ||
        !finite(m.order),
    ) ||
    new Set(layout.modules.map((m) => m.id)).size !== 4
  )
    throw Error("布局数据格式不正确");
}
export function validateDraft(draft: NoteDraft) {
  if (
    !draft ||
    typeof draft.text !== "string" ||
    draft.text.length > 10000 ||
    typeof draft.id !== "string" ||
    (draft.text.length > 0 && !draft.id) ||
    !finite(draft.updatedAt)
  )
    throw Error("草稿数据格式不正确");
}
export function validateWallpaper(asset: WallpaperAsset) {
  if (
    !asset ||
    !asset.id ||
    !["image/png", "image/jpeg", "image/webp"].includes(asset.mimeType) ||
    typeof asset.dataUrl !== "string" ||
    !/^data:image\/(png|jpeg|webp);base64,/.test(asset.dataUrl) ||
    !finite(asset.byteLength) ||
    asset.byteLength <= 0 ||
    asset.byteLength > 1_500_000 ||
    !position(asset.positionX) ||
    !position(asset.positionY)
  )
    throw Error("壁纸数据格式不正确");
}
export function validateWeather(cache: WeatherCache) {
  if (
    !cache ||
    !finite(cache.cityId) ||
    !finite(cache.temperature) ||
    !finite(cache.code) ||
    !finite(cache.fetchedAt) ||
    typeof cache.isDay !== "boolean"
  )
    throw Error("天气缓存格式不正确");
}
export function validateSnapshot(snapshot: AppSnapshot) {
  validateSettings(snapshot.settings);
  validateLayout(snapshot.layout);
  validateDraft(snapshot.draft);
  if (snapshot.wallpaper) validateWallpaper(snapshot.wallpaper);
  if (snapshot.weather) validateWeather(snapshot.weather);
  return snapshot;
}
