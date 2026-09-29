import type {
  AppSnapshot,
  EntityMap,
  Layout,
  NoteDraft,
  RecentEntry,
  Settings,
  WallpaperAsset,
  ScheduleEvent,
  WeatherCache,
} from "../domain/types";
import {
  defaultLayout,
  defaultSettings,
  seedShortcuts,
} from "../domain/defaults";
import type { StorageAdapter } from "../platform/storage";
import { builtinWallpapers } from "../domain/wallpapers";
import {
  validateEntity,
  validateSnapshot,
  validateSettings,
  validateLayout,
  validateDraft,
  validateWallpaper,
  validateWeather,
} from "./validate";
export interface Repository {
  load(): Promise<AppSnapshot>;
  save<K extends keyof EntityMap>(kind: K, entity: EntityMap[K]): Promise<void>;
  remove<K extends keyof EntityMap>(kind: K, id: string): Promise<void>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
  saveLayout(layout: Layout): Promise<void>;
  saveDraft(draft: NoteDraft, expected?: NoteDraft): Promise<void>;
  commitDraft(draft: NoteDraft): Promise<boolean>;
  saveWallpaper(asset: WallpaperAsset): Promise<void>;
  saveWeather(cache: WeatherCache): Promise<void>;
  recordRecent(entry: RecentEntry): Promise<void>;
  clearRecent(): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  reorderShortcuts(groupId: string, ids: string[]): Promise<void>;
  applyWallpaper(
    asset: WallpaperAsset | null,
    patch: Pick<Partial<Settings>, "wallpaper" | "positionX" | "positionY">,
  ): Promise<void>;
  applyWallpaperId(wallpaperId: string, position: { positionX: number; positionY: number }): Promise<void>;
  subscribe(listener: () => void): () => void;
}
export class DraftConflictError extends Error {
  constructor(public saved: NoteDraft) {
    super("草稿已更新，请选择保留哪一份");
  }
}
export const sameDraft = (a: NoteDraft, b: NoteDraft) =>
  a.id === b.id && a.updatedAt === b.updatedAt && a.text === b.text;
async function migrateLayout(data: Record<string, unknown>, adapter: StorageAdapter) {
  const current = data.layout as { version?: number; modules?: Array<{ id?: string; visible?: boolean }> } | undefined;
  if (!current || current.version === 2) return data;
  const visible = new Map((current.modules ?? []).map((item) => [item.id, item.visible]));
  const layout: Layout = {
    version: 2,
    modules: structuredClone(defaultLayout.modules).map((item) => ({
      ...item,
      visible: visible.get(item.id) ?? true,
    })),
  };
  await adapter.write({ layout });
  return adapter.readAll();
}
let fallbackQueue: Promise<unknown> = Promise.resolve();
function locked<T>(run: () => Promise<T>): Promise<T> {
  if (globalThis.navigator?.locks)
    return navigator.locks.request("personal-tab-write", run);
  const next = fallbackQueue.then(run, run);
  fallbackQueue = next.catch(() => {});
  return next;
}
export function createRepository(adapter: StorageAdapter): Repository {
  async function initialize() {
    const data = await adapter.readAll();
    if (data.schemaVersion !== undefined && data.schemaVersion !== 1 && data.schemaVersion !== 2)
      throw Error("数据版本不受支持，请更新扩展");
    if (data.schemaVersion === 1) {
      const oldSettings = { ...defaultSettings, ...(data.settings as Partial<Settings>) };
      const legacyWallpaper = data.wallpaper as WallpaperAsset | undefined;
      const wallpaperId = oldSettings.wallpaper === "custom" && legacyWallpaper ? legacyWallpaper.id : "city";
      const settings: Settings = {
        ...oldSettings,
        theme: oldSettings.theme ?? "light",
        wallpaperId: oldSettings.wallpaperId ?? wallpaperId,
        wallpaperPositions: {
          city: { positionX: 50, positionY: 50 },
          ...(legacyWallpaper ? { [legacyWallpaper.id]: { positionX: legacyWallpaper.positionX, positionY: legacyWallpaper.positionY } } : {}),
          ...(oldSettings.wallpaperPositions ?? {}),
        },
      };
      await adapter.write({
        settings,
        ...(legacyWallpaper ? { [`wallpaper:${legacyWallpaper.id}`]: legacyWallpaper } : {}),
        schemaVersion: 2,
      });
      return migrateLayout(await adapter.readAll(), adapter);
    }
    if (data.schemaVersion === 2) return migrateLayout(data, adapter);
    const seeds: Record<string, unknown> = {
      settings: defaultSettings,
      layout: defaultLayout,
      draft: { id: "", text: "", updatedAt: 0 },
      "group:default": { id: "default", name: "常用", order: 0 },
    };
    seedShortcuts.forEach((s) => {
      seeds[`shortcut:${s.id}`] = s;
    });
    await adapter.write(
      Object.fromEntries(
        Object.entries(seeds).filter(([key]) => !(key in data)),
      ),
    );
    await adapter.write({ schemaVersion: 2 });
    return adapter.readAll();
  }
  function entities<K extends keyof EntityMap>(
    data: Record<string, unknown>,
    kind: K,
  ): EntityMap[K][] {
    return Object.entries(data)
      .filter(([key]) => key.startsWith(`${kind}:`))
      .map(([, value]) => {
        validateEntity(kind, value);
        return value;
      });
  }
  return {
    load: () =>
      locked(async () => {
        const data = await initialize();
        return validateSnapshot({
          schemaVersion: 2,
          shortcuts: entities(data, "shortcut"),
          groups: entities(data, "group"),
          tasks: entities(data, "task"),
          notes: entities(data, "note"),
          recent: entities(data, "recent").sort(
            (a, b) => b.openedAt - a.openedAt,
          ),
          schedules: entities(data, "schedule").sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)),
          wallpapers: entities(data, "wallpaper"),
          settings: data.settings as Settings,
          layout: data.layout as Layout,
          draft: data.draft as NoteDraft,
          wallpaper: (data.wallpaper ?? null) as WallpaperAsset | null,
          weather: (data.weather ?? null) as WeatherCache | null,
        });
      }),
    save: (kind, entity) =>
      locked(async () => {
        validateEntity(kind, entity);
        if (kind === "shortcut") {
          const data = await adapter.readAll();
          if (!data[`group:${(entity as EntityMap["shortcut"]).groupId}`])
            throw Error("分组已删除，请重新选择分组");
        }
        await adapter.write({ [`${kind}:${entity.id}`]: entity });
      }),
    remove: (kind, id) =>
      locked(() => {
        if (kind === "group") throw Error("请使用完整的分组删除操作");
        return adapter.remove([`${kind}:${id}`]);
      }),
    saveSettings: (patch) =>
      locked(async () => {
        const data = await adapter.readAll();
        const settings = { ...(data.settings as Settings), ...patch };
        validateSettings(settings);
        await adapter.write({ settings });
      }),
    saveLayout: (layout) =>
      locked(() => {
        validateLayout(layout);
        return adapter.write({ layout });
      }),
    saveDraft: (draft, expected) =>
      locked(async () => {
        validateDraft(draft);
        if (expected) {
          const data = await adapter.readAll();
          const saved = data.draft as NoteDraft;
          validateDraft(saved);
          if (!sameDraft(saved, expected) && !sameDraft(saved, draft))
            throw new DraftConflictError(saved);
        }
        await adapter.write({ draft });
      }),
    commitDraft: (draft) =>
      locked(async () => {
        validateDraft(draft);
        if (!draft.text.trim()) return false;
        const data = await adapter.readAll();
        const existing = data[`note:${draft.id}`] as
          EntityMap["note"] | undefined;
        await adapter.write({
          [`note:${draft.id}`]: {
            id: draft.id,
            text: draft.text.trim(),
            createdAt: existing?.createdAt ?? Date.now(),
            updatedAt: Date.now(),
          },
        });
        const saved = data.draft as NoteDraft;
        if (
          saved?.id === draft.id &&
          saved.text === draft.text &&
          saved.updatedAt === draft.updatedAt
        ) {
          await adapter.write({ draft: { id: "", text: "", updatedAt: 0 } });
          return true;
        }
        return false;
      }),
    saveWallpaper: (wallpaper) =>
      locked(() => {
        validateWallpaper(wallpaper);
        return adapter.write({ wallpaper });
      }),
    saveWeather: (weather) =>
      locked(async () => {
        validateWeather(weather);
        const data = await adapter.readAll();
        if ((data.settings as Settings).city?.id === weather.cityId)
          await adapter.write({ weather });
      }),
    recordRecent: (entry) =>
      locked(async () => {
        validateEntity("recent", entry);
        const data = await adapter.readAll();
        if (!(data.settings as Settings).recordRecent) return;
        const entries = entities(data, "recent");
        const latest = [entry, ...entries.filter((r) => r.url !== entry.url)]
          .sort((a, b) => b.openedAt - a.openedAt)
          .slice(0, 20);
        await adapter.write({ [`recent:${entry.id}`]: entry });
        const keep = new Set(latest.map((r) => r.id));
        await adapter.remove(
          entries.filter((r) => !keep.has(r.id)).map((r) => `recent:${r.id}`),
        );
      }),
    clearRecent: () =>
      locked(async () => {
        const data = await adapter.readAll();
        await adapter.remove(
          Object.keys(data).filter((k) => k.startsWith("recent:")),
        );
      }),
    deleteGroup: (id) =>
      locked(async () => {
        if (id === "default") throw Error("不能删除常用分组");
        const data = await adapter.readAll();
        const sites = entities(data, "shortcut");
        const start =
          Math.max(
            -1,
            ...sites.filter((s) => s.groupId === "default").map((s) => s.order),
          ) + 1;
        const moved = sites
          .filter((s) => s.groupId === id)
          .map((s, i) => ({
            ...s,
            groupId: "default",
            order: start + i,
            updatedAt: Date.now(),
          }));
        await adapter.write(
          Object.fromEntries(moved.map((s) => [`shortcut:${s.id}`, s])),
        );
        await adapter.remove([`group:${id}`]);
      }),
    reorderShortcuts: (groupId, ids) =>
      locked(async () => {
        const data = await adapter.readAll();
        const live = entities(data, "shortcut")
          .filter((s) => s.groupId === groupId)
          .sort((a, b) => a.order - b.order);
        const unique = [...new Set(ids)];
        const sorted = [
          ...unique
            .map((id) => live.find((s) => s.id === id))
            .filter((s): s is EntityMap["shortcut"] => Boolean(s)),
          ...live.filter((s) => !unique.includes(s.id)),
        ];
        await adapter.write(
          Object.fromEntries(
            sorted.map((s, order) => [`shortcut:${s.id}`, { ...s, order }]),
          ),
        );
      }),
    applyWallpaper: (asset, patch) =>
      locked(async () => {
        const data = await adapter.readAll();
        const settings = { ...(data.settings as Settings), ...patch };
        validateSettings(settings);
        if (asset) validateWallpaper(asset);
        if (settings.wallpaper === "custom" && !asset && !data.wallpaper)
          throw Error("请先选择壁纸");
        await adapter.write({
          settings,
          ...(asset ? { wallpaper: asset } : {}),
        });
      }),
    applyWallpaperId: (wallpaperId, position) =>
      locked(async () => {
        if (!wallpaperId || !Number.isFinite(position.positionX) || position.positionX < 0 || position.positionX > 100 || !Number.isFinite(position.positionY) || position.positionY < 0 || position.positionY > 100) throw Error("壁纸设置格式不正确");
        const data = await adapter.readAll();
        const settings = data.settings as Settings;
        if (!builtinWallpapers.some((item) => item.id === wallpaperId) && !data[`wallpaper:${wallpaperId}`]) throw Error("请选择有效壁纸");
        const next: Settings = {
          ...settings,
          wallpaperId,
          wallpaperPositions: { ...settings.wallpaperPositions, [wallpaperId]: position },
          wallpaper: wallpaperId === "city" ? "city" : "custom",
          positionX: position.positionX,
          positionY: position.positionY,
        };
        validateSettings(next);
        await adapter.write({ settings: next });
      }),
    subscribe: (listener) => adapter.subscribe(listener),
  };
}
