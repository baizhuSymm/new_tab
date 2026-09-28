export type SearchEngine = "bing" | "baidu" | "google";
export type AppView = "home" | "tasks" | "notes";
export type ModuleId = "shortcuts" | "tasks" | "notes" | "recent";
export type LayoutColumn = "left" | "right" | "full";
export interface Shortcut {
  id: string;
  name: string;
  url: string;
  icon: string;
  groupId: string;
  order: number;
  updatedAt: number;
}
export interface ShortcutGroup {
  id: string;
  name: string;
  order: number;
}
export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: number | null;
  order: number;
  updatedAt: number;
}
export interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}
export interface NoteDraft {
  id: string;
  text: string;
  updatedAt: number;
}
export interface RecentEntry {
  id: string;
  url: string;
  name: string;
  icon: string;
  openedAt: number;
}
export interface City {
  id: number;
  name: string;
  country: string;
  admin1: string;
  latitude: number;
  longitude: number;
  timezone: string;
}
export interface WeatherCache {
  cityId: number;
  temperature: number;
  code: number;
  isDay: boolean;
  fetchedAt: number;
}
export interface WallpaperAsset {
  id: string;
  dataUrl: string;
  mimeType: string;
  byteLength: number;
  positionX: number;
  positionY: number;
}
export interface Settings {
  searchEngine: SearchEngine;
  openTarget: "current" | "new";
  hourFormat: "12" | "24";
  recordRecent: boolean;
  city: City | null;
  wallpaper: "city" | "custom";
  positionX: number;
  positionY: number;
}
export interface Layout {
  version: 1;
  modules: {
    id: ModuleId;
    column: LayoutColumn;
    order: number;
    visible: boolean;
  }[];
}
export interface EntityMap {
  shortcut: Shortcut;
  group: ShortcutGroup;
  task: Task;
  note: Note;
  recent: RecentEntry;
}
export interface AppSnapshot {
  shortcuts: Shortcut[];
  groups: ShortcutGroup[];
  tasks: Task[];
  notes: Note[];
  recent: RecentEntry[];
  settings: Settings;
  layout: Layout;
  draft: NoteDraft;
  wallpaper: WallpaperAsset | null;
  weather: WeatherCache | null;
  schemaVersion: number;
}
