import type { AppSnapshot, EntityMap, Layout, NoteDraft, RecentEntry, Settings, WallpaperAsset, WeatherCache } from '../domain/types';
import { defaultLayout, defaultSettings, seedShortcuts } from '../domain/defaults';
import type { StorageAdapter } from '../platform/storage';
import { validateEntity, validateSnapshot } from './validate';
export interface Repository {
  load(): Promise<AppSnapshot>;
  save<K extends keyof EntityMap>(kind: K, entity: EntityMap[K]): Promise<void>;
  remove<K extends keyof EntityMap>(kind: K, id: string): Promise<void>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
  saveLayout(layout: Layout): Promise<void>;
  saveDraft(draft: NoteDraft): Promise<void>;
  commitDraft(draft: NoteDraft): Promise<void>;
  saveWallpaper(asset: WallpaperAsset): Promise<void>;
  saveWeather(cache: WeatherCache): Promise<void>;
  recordRecent(entry: RecentEntry): Promise<void>;
  clearRecent(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
let fallbackQueue: Promise<unknown> = Promise.resolve();
function locked<T>(run: () => Promise<T>): Promise<T> {
  if (globalThis.navigator?.locks) return navigator.locks.request('personal-tab-write', run);
  const next = fallbackQueue.then(run, run); fallbackQueue = next.catch(() => {}); return next;
}
export function createRepository(adapter: StorageAdapter): Repository {
  async function initialize() {
    const data = await adapter.readAll();
    if (data.schemaVersion !== undefined && data.schemaVersion !== 1) throw Error('数据版本不受支持，请更新扩展');
    if (data.schemaVersion === 1) return data;
    const seeds: Record<string, unknown> = { settings: defaultSettings, layout: defaultLayout, draft: { id: '', text: '', updatedAt: 0 }, 'group:default': { id: 'default', name: '常用', order: 0 } };
    seedShortcuts.forEach(s => { seeds[`shortcut:${s.id}`] = s; });
    await adapter.write(Object.fromEntries(Object.entries(seeds).filter(([key]) => !(key in data))));
    await adapter.write({ schemaVersion: 1 }); return adapter.readAll();
  }
  function entities<K extends keyof EntityMap>(data: Record<string, unknown>, kind: K): EntityMap[K][] {
    return Object.entries(data).filter(([key]) => key.startsWith(`${kind}:`)).map(([, value]) => { validateEntity(kind, value); return value; });
  }
  return {
    load: () => locked(async () => { const data = await initialize(); return validateSnapshot({ schemaVersion: 1, shortcuts: entities(data, 'shortcut'), groups: entities(data, 'group'), tasks: entities(data, 'task'), notes: entities(data, 'note'), recent: entities(data, 'recent').sort((a, b) => b.openedAt - a.openedAt), settings: data.settings as Settings, layout: data.layout as Layout, draft: data.draft as NoteDraft, wallpaper: (data.wallpaper ?? null) as WallpaperAsset | null, weather: (data.weather ?? null) as WeatherCache | null }); }),
    save: (kind, entity) => locked(async () => { validateEntity(kind, entity); await adapter.write({ [`${kind}:${entity.id}`]: entity }); }),
    remove: (kind, id) => locked(() => adapter.remove([`${kind}:${id}`])),
    saveSettings: patch => locked(async () => { const data = await adapter.readAll(); await adapter.write({ settings: { ...(data.settings as Settings), ...patch } }); }),
    saveLayout: layout => locked(() => adapter.write({ layout })),
    saveDraft: draft => locked(() => adapter.write({ draft })),
    commitDraft: draft => locked(async () => {
      if (!draft.text.trim()) return;
      const data = await adapter.readAll(); const existing = data[`note:${draft.id}`] as EntityMap['note'] | undefined;
      await adapter.write({ [`note:${draft.id}`]: { id: draft.id, text: draft.text.trim(), createdAt: existing?.createdAt ?? Date.now(), updatedAt: Date.now() } });
      const saved = data.draft as NoteDraft;
      if (saved?.id === draft.id && saved.text === draft.text && saved.updatedAt === draft.updatedAt) await adapter.write({ draft: { id: '', text: '', updatedAt: 0 } });
    }),
    saveWallpaper: wallpaper => locked(() => adapter.write({ wallpaper })),
    saveWeather: weather => locked(async () => { const data = await adapter.readAll(); if ((data.settings as Settings).city?.id === weather.cityId) await adapter.write({ weather }); }),
    recordRecent: entry => locked(async () => {
      const data = await adapter.readAll(); if (!(data.settings as Settings).recordRecent) return;
      const entries = entities(data, 'recent');
      const latest = [entry, ...entries.filter(r => r.url !== entry.url)].sort((a, b) => b.openedAt - a.openedAt).slice(0, 20);
      await adapter.write({ [`recent:${entry.id}`]: entry }); const keep = new Set(latest.map(r => r.id));
      await adapter.remove(entries.filter(r => !keep.has(r.id)).map(r => `recent:${r.id}`));
    }),
    clearRecent: () => locked(async () => { const data = await adapter.readAll(); await adapter.remove(Object.keys(data).filter(k => k.startsWith('recent:'))); }),
    subscribe: listener => adapter.subscribe(listener),
  };
}
