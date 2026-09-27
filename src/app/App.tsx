import { useState } from "react";
import {
  Settings,
  House,
  Bookmark,
  SquareCheck,
  StickyNote,
  Image as ImageIcon,
  LayoutGrid,
  X,
  Check,
  ArrowLeft,
} from "lucide-react";
import { AppProvider, useAppData } from "./AppProvider";
import { IconButton } from "../ui/IconButton";
import type { AppView, Layout, Shortcut } from "../domain/types";
import { SearchBar } from "../features/search/SearchBar";
import { openDestination } from "../features/search/navigation";
import { ShortcutGrid } from "../features/shortcuts/ShortcutGrid";
import { TaskPanel } from "../features/tasks/TaskPanel";
import { QuickNote } from "../features/notes/QuickNote";
import { useNoteDraft } from "../features/notes/useNoteDraft";
import { ModuleGrid } from "../features/layout/ModuleGrid";
import { RecentStrip } from "../features/recent/RecentStrip";
import { SettingsPanel } from "../features/settings/SettingsPanel";
import { WallpaperPanel } from "../features/wallpaper/WallpaperPanel";
import { WeatherWidget, CityPicker } from "../features/weather/WeatherWidget";
import { useClock } from "../features/clock/useClock";
import styles from "./App.module.css";
export function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
function Shell() {
  const { snapshot, repository, run, error, clearError } = useAppData();
  const note = useNoteDraft(snapshot.draft, repository);
  const [view, setView] = useState<AppView>("home"),
    [panel, setPanel] = useState<"settings" | "wallpaper" | "weather" | null>(
      null,
    ),
    [draftLayout, setDraftLayout] = useState<Layout | null>(null),
    [saving, setSaving] = useState(false);
  const now = useClock(),
    settings = snapshot.settings;
  function navigate(next: AppView) {
    if (draftLayout && !confirm("放弃尚未保存的布局？")) return;
    setDraftLayout(null);
    setView(next);
  }
  function editLayout() {
    setPanel(null);
    setView("home");
    setDraftLayout(structuredClone(snapshot.layout));
  }
  function open(site: Pick<Shortcut, "name" | "url" | "icon">, record = true) {
    if (!record) {
      openDestination(site.url, settings.openTarget);
      return;
    }
    const action = () =>
      repository.recordRecent({
        ...site,
        id: crypto.randomUUID(),
        openedAt: Date.now(),
      });
    if (settings.openTarget === "new") {
      openDestination(site.url, "new");
      void run(action);
    } else {
      void run(action).finally(() => openDestination(site.url, "current"));
    }
  }
  const source =
    settings.wallpaper === "custom" && snapshot.wallpaper
      ? snapshot.wallpaper.dataUrl
      : "./wallpapers/city-panorama.png";
  const nav = [
    { id: "home", label: "首页", icon: House },
    { id: "shortcuts", label: "网站管理", icon: Bookmark },
    { id: "tasks", label: "待办管理", icon: SquareCheck },
    { id: "notes", label: "便签管理", icon: StickyNote },
  ] as const;
  return (
    <div className={styles.app}>
      <nav className={styles.rail} aria-label="主导航">
        <div className={styles.navTop}>
          {nav.map(({ id, label, icon: Icon }) => (
            <IconButton
              key={id}
              label={label}
              className={view === id ? styles.active : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={21} strokeWidth={1.7} />
            </IconButton>
          ))}
          <div className={styles.railDivider} />
          <IconButton label="壁纸" onClick={() => setPanel("wallpaper")}>
            <ImageIcon size={21} strokeWidth={1.7} />
          </IconButton>
          <IconButton label="设置" onClick={() => setPanel("settings")}>
            <Settings size={21} strokeWidth={1.7} />
          </IconButton>
        </div>
        <div className={styles.navBottom}>
          <IconButton label="编辑布局" onClick={editLayout}>
            <LayoutGrid size={19} strokeWidth={1.7} />
          </IconButton>
          <span title="拾页">拾</span>
        </div>
      </nav>
      <main className={styles.main}>
        <header className={styles.hero}>
          <img
            className={styles.wallpaper}
            src={source}
            alt="城市晨光壁纸"
            style={{
              objectPosition: `${settings.positionX}% ${settings.positionY}%`,
            }}
          />
          <div className={styles.heroContent}>
            <div className={styles.clock}>
              <time>
                {now
                  .toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: settings.hourFormat === "12",
                  })
                  .replace(/ (am|pm)/i, "")}
              </time>
              {settings.hourFormat === "12" && (
                <small>{now.getHours() < 12 ? "上午" : "下午"}</small>
              )}
              <p>
                {now.toLocaleDateString("zh-CN", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </p>
            </div>
            <WeatherWidget onConfigure={() => setPanel("weather")} />
          </div>
        </header>
        <div className={styles.content}>
          <SearchBar onOpen={open} />
          {error && (
            <div className={styles.error} role="alert">
              <span>保存或读取失败：{error}</span>
              <IconButton label="关闭提示" onClick={clearError}>
                <X size={16} />
              </IconButton>
            </div>
          )}
          {draftLayout && (
            <div className={styles.editToolbar}>
              <strong>编辑布局</strong>
              <span />
              <button onClick={() => setDraftLayout(null)} disabled={saving}>
                <X size={15} />
                取消
              </button>
              <button
                className="primary"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  if (await run(() => repository.saveLayout(draftLayout)))
                    setDraftLayout(null);
                  setSaving(false);
                }}
              >
                <Check size={15} />
                保存布局
              </button>
            </div>
          )}
          <div className={styles.body}>
            {view !== "home" && (
              <button className={styles.back} onClick={() => navigate("home")}>
                <ArrowLeft size={15} />
                返回首页
              </button>
            )}
            {view === "home" ? (
              <ModuleGrid
                layout={draftLayout ?? snapshot.layout}
                editing={Boolean(draftLayout)}
                onChange={setDraftLayout}
              >
                {{
                  shortcuts: <ShortcutGrid onOpen={open} />,
                  tasks: <TaskPanel />,
                  notes: (
                    <QuickNote
                      note={note}
                      onHistory={() => navigate("notes")}
                    />
                  ),
                  recent: <RecentStrip onOpen={open} />,
                }}
              </ModuleGrid>
            ) : (
              <div className={styles.management}>
                {view === "shortcuts" ? (
                  <ShortcutGrid onOpen={open} management />
                ) : view === "tasks" ? (
                  <TaskPanel management />
                ) : (
                  <QuickNote note={note} management />
                )}
              </div>
            )}
          </div>
          <footer className={styles.footer}>
            <span>拾页</span>
            <span>把日常，放在顺手的地方。</span>
          </footer>
        </div>
      </main>
      {panel === "settings" && (
        <SettingsPanel
          onClose={() => setPanel(null)}
          onLayout={editLayout}
          onWallpaper={() => setPanel("wallpaper")}
          onWeather={() => setPanel("weather")}
        />
      )}
      {panel === "wallpaper" && (
        <WallpaperPanel onClose={() => setPanel(null)} />
      )}
      {panel === "weather" && <CityPicker onClose={() => setPanel(null)} />}
    </div>
  );
}
