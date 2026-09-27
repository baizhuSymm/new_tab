# 个人新标签页第一版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可安装于 Chrome/Edge 的个人新标签页扩展，以选定的第三张设计图实现搜索、快捷网站、待办、便签、拖拽布局、壁纸、天气及本地保存。

**Architecture:** 使用同一个 React 应用提供扩展入口和普通网页预览，通过平台适配器隔离浏览器存储及可选权限。功能代码按领域拆分，持久化采用独立实体键，首页组合各功能模块。原生 Vite 输出静态资源，手工维护 Manifest V3。

**Tech Stack:** React 19.3.0、TypeScript、Vite 8.3.1、CSS Modules、CSS Variables、Lucide React、dnd-kit、Vitest、React Testing Library、Playwright；npm 管理依赖。

**Spec:** [已确认的设计规格](../specs/2026-09-26-personal-new-tab-design.md)

**Visual Target:** [第三张设计图](../specs/assets/selected-concept.png)

**状态：** 用户已批准主代理顺序执行与独立审查。2026-09-27：任务 1–10 已实现，任务 11 的网页验证、构建、文档已执行；完整 Chromium 扩展自动化受本机 Windows SideBySide 错误阻塞，Chrome/Edge 手动加载仍待确认。详细执行证据见 `docs/verification.md`。下方步骤保留为原批准计划，不将环境受阻项标成完成。

**执行调整：** 为便于复用，部分组件/测试合并在功能目录文件内；语义测试集中于 `storage`、`notes` 与 Playwright 套件。任务 1–2 合并基础提交，其余跨模块修复在浏览器回归后统一提交。没有引入 WXT、后端、在线图标请求或生产演示数据。

## Global Constraints

- 使用 React + TypeScript + 原生 Vite，自行维护扩展清单与打包配置。
- 样式使用 CSS Modules + CSS Variables。
- 第一版纯本地、无需登录，使用 `chrome.storage.local` 保存用户数据。
- 支持 Chrome/Edge Manifest V3 扩展，同时提供普通网页开发预览。
- 默认必应、当前标签页打开、24 小时制、浅色主题；天气初始未配置。
- 以第三张图为基准，基础文字 14–16px，模块标题约 18–20px，时间约 56px；字距为 0，圆角不超过 8px。
- 1440×1024 为主要对照尺寸，同时覆盖 1366×768、1024×768、390×844 和 320px 窄屏。
- 首次真实安装只预置可删除的网站，待办和便签为空；测试数据只能通过测试环境注入。
- 搜索与横幅固定，其余四个模块在预设网格中调整；禁止自由重叠布局。
- 数据读取失败不得触发重置；自动保存以实际写入结果反馈状态。
- 天气缓存 30 分钟；草稿自动保存延迟约 300ms；最近打开最多 20 个 URL。
- 自定义壁纸只保留一张，支持 PNG/JPEG/WebP，压缩后大小上限 1.5MB。
- 不实现账号、云同步、后端、AI、通知、商店发布、深色模式和导入导出。
- 先读本计划和规格，再逐项实现。发现无法满足的约束记录证据，不静默改范围。

## Review Focus

1. 两个新标签页同时编辑不同实体，以及读取失败、配额失败：已有数据不能被默认值或旧快照覆盖。归属任务 2、11。
2. 中文输入法回车、前后空格、危险协议及域名判断：搜索不能误提交或执行非网页 URL。归属任务 4。
3. 本地午夜、恢复前台及无日期任务：今日/稍后分类和时钟应立即正确。归属任务 5、8。
4. 草稿写入未完成即提交、连续输入和跨标签页编辑：不能出现重复便签、错误成功或旧草稿回流。归属任务 6。
5. 图片损坏/超限和天气切换城市时旧请求迟到：旧壁纸不丢失，天气不会回到上一个城市。归属任务 8、9。

## 实施前核对

- 当前项目只有设计文件，尚无 Git 仓库和产品代码。执行阶段初始化本地 Git、提交已批准文档，之后按任务提交；不创建远程仓库、不推送。
- 已实际读取本机 Node `v24.19.0`；npm registry 返回 React `19.3.0`、Vite `8.3.1`。Vite 声明 Node `^20.19.0 || >=22.12.0`。
- Context7 在当前会话中无可调用工具；本计划依据 npm 包元数据与官方文档。实施时优先使用恢复可用的 Context7，否则继续官方文档核对。
- 拖拽选用已核对兼容声明的 `@dnd-kit/core@6.3.1`、`@dnd-kit/sortable@10.0.0` 和兼容的 utilities。官方将这套 API 归入 legacy 文档；本版只使用这套 API，不混用新版 `@dnd-kit/react`。
- 其余依赖在安装时核对 peerDependencies，以 `--save-exact` 和 `package-lock.json` 固定；不得使用 `--force` 或 `--legacy-peer-deps` 掩盖冲突。
- 当前执行工具可使用子代理。建议主代理顺序实现相互依赖的任务，完成后独立代码审查；视觉素材可在实现期间单独生成。

## 文件与接口约定

以下目录按任务逐步创建，避免一次生成空壳文件。每个功能的纯逻辑、Hook、组件和 CSS 在同一目录；仅共享类型和基础 UI 进入公共目录。

```text
public/manifest.json, public/icon/, public/wallpapers/, public/site-icons/
src/main.tsx
src/app/App.tsx, App.module.css, AppProvider.tsx
src/styles/tokens.css, global.css
src/domain/types.ts, defaults.ts
src/platform/storage.ts, chrome-storage.ts, web-storage.ts, permissions.ts
src/data/repository.ts, initialize.ts, validate.ts
src/ui/IconButton.tsx, Dialog.tsx, Drawer.tsx, SaveStatus.tsx
src/features/search/, shortcuts/, tasks/, notes/, layout/, wallpaper/, clock/, weather/, recent/, settings/
tests/setup.ts, tests/fixtures.ts, tests/e2e/
scripts/check-build.mjs
vite.config.ts, vitest.config.ts, playwright.config.ts
package.json, package-lock.json, tsconfig.json, index.html
README.md, design-qa.md, docs/verification.md, docs/assets.md
```

持久化 API 在任务 2 定义，后续任务必须使用它：

```ts
type StorageChanges = Record<string, { oldValue?: unknown; newValue?: unknown }>;
interface StorageAdapter {
  readAll(): Promise<Record<string, unknown>>;
  write(values: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  subscribe(listener: (changes: StorageChanges) => void): () => void;
}
interface Repository {
  load(): Promise<AppSnapshot>;
  save<K extends keyof EntityMap>(kind: K, entity: EntityMap[K]): Promise<void>;
  remove<K extends keyof EntityMap>(kind: K, id: string): Promise<void>;
  saveSettings(patch: Partial<Settings>): Promise<void>;
  saveLayout(layout: Layout): Promise<void>;
  saveDraft(draft: NoteDraft): Promise<void>;
  commitDraft(draft: NoteDraft): Promise<void>;
  saveWallpaper(asset: WallpaperAsset): Promise<void>;
  saveWeather(cache: WeatherCache): Promise<void>;
  clearRecent(): Promise<void>;
  recordRecent(entry: RecentEntry): Promise<void>;
  subscribe(listener: () => void): () => void;
}
```

`EntityMap` 包含 `shortcut`、`group`、`task`、`note`、`recent`。每个实体都有稳定 `id`；写入键为 `kind:id`。`AppSnapshot` 包含上述实体数组，以及 `settings`、`layout`、`draft`、可空 `wallpaper`、可空 `weather` 和 `schemaVersion`。`Layout` 包含版本和 `{id, column, order, visible}` 模块项，column 为 `left | right | full`。

所有日期分为本地日期字符串 `YYYY-MM-DD`、可选本地时间 `HH:mm` 和 UTC 毫秒时间戳，不能混用 UTC 日期推算用户今天。Settings 不保存大图片，WallpaperAsset 独立保存数据 URL 和裁切位置。

## 任务 1：建立可加载的扩展与首页外壳

**文件：** 创建根目录配置、`public/manifest.json`、`src/main.tsx`、`src/app/App.tsx`、`src/app/App.module.css`、`src/styles/`、`src/ui/`、`tests/setup.ts`、`tests/app.test.tsx`、`scripts/check-build.mjs`、`docs/assets.md`；生成 `public/wallpapers/city-panorama.webp` 与扩展图标。

**接口：** 导出 `App(): React.JSX.Element`；`AppView = 'home' | 'shortcuts' | 'tasks' | 'notes'`；`IconButton` 接受 `label`、`onClick` 和图标子元素；Dialog/Drawer 接受 `open`、`title`、`onClose` 和内容。

- [ ] 建立本地 Git 与 `.gitignore`，先提交设计规格及计划；忽略依赖、构建、测试报告与临时浏览器资料。
- [ ] 建立 npm 脚本：`dev`、`build`（先 typecheck，再 vite build，再 check-build）、`typecheck`、`test`、`test:e2e:web`、`test:e2e:extension`，安装兼容且精确锁定的依赖。
- [ ] 编写 `app.test.tsx`：导航有可访问名称，侧边面板关闭后焦点返回触发按钮。运行 `npm test -- tests/app.test.tsx`，确认实现前失败。
- [ ] 按 Product Design image-to-code 流程读取所选图片，用 ImageGen 独立生成清晰城市横幅和图标位图，保存到 `public/` 并记录来源；系统字体栈使用本机中文无衬线字体，保持离线可用。
- [ ] 实现外壳和基础 UI。Manifest 指定 `chrome_url_overrides.newtab: 'index.html'`、`permissions: ['storage']`、MV3 和本地图标；基础版无后台脚本。Vite `base: './'`，公共资源随构建复制；生产代码不包含远程脚本和开发 HMR。
- [ ] 执行上述组件测试和 `npm run build`；check-build 使用 JSON/HTML 结构检查清单入口和引用文件存在，并拒绝脚本加载地址与静态模块导入中的开发服务器/HMR 引用；不能仅因业务代码支持 localhost 网址而拒绝构建。
- [ ] 提交本任务具体文件，提交说明 `feat: bootstrap React new tab extension`。

## 任务 2：建立可靠的本地存储与初始化

**文件：** 创建 `src/domain/types.ts`、`defaults.ts`、`src/platform/storage.ts`、`chrome-storage.ts`、`web-storage.ts`、`src/data/repository.ts`、`initialize.ts`、`validate.ts`、`src/app/AppProvider.tsx`、`tests/storage.test.ts`；修改 App 接入加载状态。

**接口：** 实现上述 StorageAdapter 和 Repository；导出 `createRepository(adapter: StorageAdapter): Repository`、`initialize(adapter: StorageAdapter): Promise<void>`、`useAppData(): { snapshot: AppSnapshot | null; repository: Repository; loading: boolean; error: Error | null; retry(): void }`。

- [ ] 编写并运行 `npm test -- tests/storage.test.ts`，先验证失败：读取异常时 `write` 未调用；两个客户端分别保存任务 A/B 后二者都在；清空预置网站后重新初始化仍为空；配额异常会向调用者抛出。
- [ ] 实现独立实体键、读取校验和 schemaVersion=1。预置网站使用固定 id，初始化写入和用户写入通过同源 Web Locks 串行化，锁内重新读取以防首次双开冲突；初始化成功后才写完成标记，已有数据不覆盖。
- [ ] 实现 `chrome.storage.onChanged` 订阅，以及网页 localStorage 的逐键写入、storage 事件和同页通知；两个适配器使用不同命名空间，扩展 API 不可用时不静默丢失数据。
- [ ] Repository 使用最新持久化值合并 Settings patch，更新成功后发布快照；同一实体最后写入生效。`recordRecent` 在同源锁内读取、按 URL 去重并裁剪至 20 项；`commitDraft` 在同一锁内幂等保存便签，只有已存草稿的 id、text、updatedAt 都匹配提交值时才清空，避免删除其他标签页的新输入。数据异常保留原始值并返回可重试错误，拒绝未知更高版本，不执行清空。
- [ ] AppProvider 等待初始化及读取后再渲染可编辑功能，加载失败显示重试。用同一套适配器契约测试验证行为。
- [ ] 运行存储测试及 `npm run typecheck`，通过后提交 `feat: persist local data with cross-tab updates`。

## 任务 3：快捷网站、分组与最近打开

**文件：** 创建 `src/features/shortcuts/ShortcutGrid.tsx`、`ShortcutManager.tsx`、`ShortcutForm.tsx`、`useShortcuts.ts`、`shortcuts.module.css`、`src/features/recent/recent.ts`、`RecentStrip.tsx`、`src/domain/urls.ts`、`tests/shortcuts.test.tsx`、`tests/recent.test.ts`，添加 `public/site-icons/`。

**接口：** 使用 Repository；导出 `normalizeWebUrl(input: string): string | null`、`upsertRecent(entries: RecentEntry[], entry: RecentEntry): RecentEntry[]`。站点组件从 AppProvider 获取数据，`onOpen(shortcut: Shortcut)` 由首页传入任务 4 的导航方法。

- [ ] 写测试并确认失败：名称和 URL 必填，编辑后刷新值不变，跨分组移动生效；重复 URL 最近打开去重；插入第 21 项后 `expect(result).toHaveLength(20)`；关闭记录后不写 recent 键。
- [ ] 实现 HTTP/HTTPS URL 校验、名称长度上限 80、组名上限 40。为无图标站点提供 Lucide 通用图标；内置品牌图标使用有来源记录的本地素材。
- [ ] 实现组内键盘移动菜单、移动分组、删除确认；删除分组时将站点移到固定“常用”分组，默认分组不可删除。最近打开按打开时间降序，支持清空与关闭。
- [ ] 接入首页网站网格及完整管理视图。拖拽交互在任务 7 接入，不在此手写拖拽引擎。
- [ ] 运行 `npm test -- tests/shortcuts.test.tsx tests/recent.test.ts` 及 typecheck，通过后提交 `feat: manage shortcuts and recent launches`。

## 任务 4：搜索、网址跳转与键盘交互

**文件：** 创建 `src/features/search/resolveSearch.ts`、`SearchBar.tsx`、`navigation.ts`、`search.module.css`、`tests/search.test.ts`、`tests/search-bar.test.tsx`；修改 App 和快捷网站打开处理。

**接口：** `resolveSearch(input: string, engine: Settings['searchEngine']): { kind: 'url' | 'search'; url: string } | null`；`matchShortcuts(input: string, shortcuts: Shortcut[]): Shortcut[]`；`openDestination(url: string, target: Settings['openTarget']): void`。

- [ ] 编写失败测试：`example.com` 补 HTTPS；中文和包含空格的短语编码到搜索 URL；空白不导航；大小写混合或前导空白的危险协议拒绝；输入法 composition 状态回车不触发导航。
- [ ] 实现 URL 构造与三个引擎：必应 `https://www.bing.com/search?q=`、百度 `https://www.baidu.com/s?wd=`、Google `https://www.google.com/search?q=`。站点搜索只查询本地记录，最多展示 6 个匹配。
- [ ] 实现 combobox 列表、上下键、Enter、Esc、引擎菜单和清空按钮。接受有效域名、IPv4、localhost 及可选端口；不把普通点号词和冒号短语自动当作危险可执行地址。
- [ ] 新标签页打开动作在用户点击调用栈内完成，避免异步记录导致弹窗被拦截；默认当前页导航前尝试保存 recent，失败不永久阻止打开并记录可见错误反馈。记录逻辑与导航逻辑分别测试。
- [ ] 运行 `npm test -- tests/search.test.ts tests/search-bar.test.tsx`，通过后提交 `feat: add search and safe website navigation`。

## 任务 5：今日与稍后待办

**文件：** 创建 `src/features/tasks/taskDates.ts`、`useTasks.ts`、`TaskPanel.tsx`、`TaskForm.tsx`、`TaskManager.tsx`、`tasks.module.css`、`tests/tasks.test.tsx`、`tests/task-dates.test.ts`。

**接口：** `classifyTask(task: Task, today: string): 'today' | 'later' | 'completed'`；`localDate(date: Date): string`。Task 包含 `id,title,description,dueDate,dueTime,completedAt,order,updatedAt`，空日期和时间用 null。

- [ ] 编写并运行失败测试：today='2026-09-26' 时 9月25日/26日任务属于 today、27日及无日期属于 later、已完成属于 completed；午夜改变日期后自动重新分类。
- [ ] 实现本地日期分类、新增/编辑/完成/撤销/删除，以及移动今日或稍后。标题上限 200，备注上限 2000；拒绝无日期但有时间、格式错误日期和不存在的日历日期。
- [ ] 实现首页面板与完整管理视图，完成项折叠、逾期标记、保存失败反馈及删除确认。监听页面恢复前台和午夜更新分类。
- [ ] 使用组件测试检查保存错误时保留表单和未完成状态，运行 `npm test -- tests/tasks.test.tsx tests/task-dates.test.ts`。
- [ ] 通过后提交 `feat: add persistent daily tasks`。

## 任务 6：快速记录与便签管理

**文件：** 创建 `src/features/notes/useNoteDraft.ts`、`commitNote.ts`、`QuickNote.tsx`、`NoteManager.tsx`、`notes.module.css`、`src/ui/SaveStatus.tsx`、`tests/notes.test.tsx`。

**接口：** `commitNote(repository: Repository, draft: NoteDraft): Promise<void>`；`NoteDraft = { id: string; text: string; updatedAt: number }`，id 在首次输入时创建并用于提交 Note 的幂等 id。

- [ ] 以 fake timers 编写失败测试：299ms 无写入，300ms 保存；失焦立即保存；提交在已有延迟写入之后仍只产生一个 Note；写入失败不清空草稿且显示失败状态。
- [ ] 实现每个草稿的串行保存队列，提交前取消延迟任务、等待已发写入，再调用任务 2 的 `repository.commitDraft(draft)`；重复提交相同 id 不生成重复便签，外部更新的草稿不能被旧提交清空。正文上限 10000 字符，空白内容不提交。
- [ ] 外部草稿更新到达而当前未保存时保留当前输入，显示“保留本地”与“载入已保存内容”操作；单纯重新加载不主动覆盖存储。
- [ ] 实现首页输入、显式保存命令、便签列表与编辑/删除，提供实际保存状态，保持纯文本。
- [ ] 运行 `npm test -- tests/notes.test.tsx`，通过后提交 `feat: add autosaved notes and draft recovery`。

## 任务 7：可取消的网格布局与站点拖拽

**文件：** 创建 `src/features/layout/layout.ts`、`LayoutEditor.tsx`、`ModuleGrid.tsx`、`layout.module.css`、`tests/layout.test.ts`、`tests/e2e/layout.spec.ts`；修改 ShortcutGrid 接入排序。

**接口：** `moveModule(layout: Layout, id: ModuleId, column: LayoutColumn, index: number): Layout`；`ModuleId = 'shortcuts' | 'tasks' | 'notes' | 'recent'`。默认 shortcuts 在 left、tasks/notes 在 right、recent 在 full。

- [ ] 编写失败测试：移动到空列成功；模块 id 不重复/丢失；取消编辑与原布局相等；恢复默认不修改其他实体；隐藏后可以恢复。
- [ ] 使用 dnd-kit 的 PointerSensor、KeyboardSensor 和 sortable，模块拖拽只在编辑模式启用；站点拖拽有独立上下文和手柄，避免与外部模块拖拽冲突。
- [ ] 布局编辑使用本地副本，完成时一次保存 Layout，保存失败保持编辑态；取消只丢弃副本。鼠标拖动到无效区域则回原位，减少动画偏好关闭位移动画。
- [ ] 为所有移动提供菜单操作；窄屏按 left/right/full 的模块顺序展示，切换视口不保存新布局。仅在完成拖动时写排序值。
- [ ] 运行 `npm test -- tests/layout.test.ts`，并在任务 11 的浏览器套件验证拖拽、取消和键盘移动；通过当前检查后提交 `feat: add editable widget layout`。

## 任务 8：时间、壁纸与设置面板

**文件：** 创建 `src/features/clock/useClock.ts`、`Clock.tsx`、`src/features/wallpaper/prepareWallpaper.ts`、`WallpaperPanel.tsx`、`src/features/settings/SettingsPanel.tsx`、各模块 CSS、`tests/clock.test.tsx`、`tests/wallpaper.test.ts`、`tests/settings.test.tsx`。

**接口：** `prepareWallpaper(file: File): Promise<WallpaperAsset>`；WallpaperAsset 包含 `id,dataUrl,mimeType,byteLength,positionX,positionY`，裁切位置取 0–100。Settings 的显示/布局选项调用 Repository 或任务 7 的布局操作。

- [ ] 写失败测试：12/24 小时切换、系统时间变化后恢复前台立即更新；损坏图片/不支持格式被拒绝；压缩失败时旧壁纸不变；设置更新不会覆盖其他字段。
- [ ] 实现图片解码、最大宽度 2560px 等比例压缩至 WebP 和字节计数，1.5MB 明确为 1,500,000 字节；原始文件上限 20MB，解码尺寸不超过 4000 万像素，越界提示。
- [ ] 将位图保存在独立键，Settings 只保存引用；确认图片保存成功后才切换显示。支持内置壁纸、单张本地替换与裁切位置预览。
- [ ] 实现时间显示、设置侧边面板、搜索引擎/打开方式/时间格式/最近记录开关，复用任务 7 的模块显隐及恢复布局操作；主题保持浅色。
- [ ] 运行 `npm test -- tests/clock.test.tsx tests/wallpaper.test.ts tests/settings.test.tsx`；图片真实解码在任务 11 浏览器测试补验，通过后提交 `feat: customize wallpaper and local preferences`。

## 任务 9：可选天气与城市选择

**文件：** 创建 `src/features/weather/api.ts`、`useWeather.ts`、`WeatherWidget.tsx`、`CityPicker.tsx`、`weather.module.css`、`src/platform/permissions.ts`、`tests/weather.test.ts`、`tests/weather-widget.test.tsx`；修改 Manifest 可选域名权限。

**接口：** `searchCities(query: string, signal: AbortSignal): Promise<City[]>`；`fetchCurrentWeather(city: City, signal: AbortSignal): Promise<WeatherCache>`；`requestWeatherAccess(): Promise<boolean>`。City 包含 `id,name,country,admin1,latitude,longitude,timezone`。

- [ ] 写失败测试：未配置/权限拒绝时不发天气请求；缓存 29 分钟时复用、达到 30 分钟刷新；请求超时保留旧值；城市 A 的迟到响应不能覆盖已选择的 B。
- [ ] 添加可选域名 `https://api.open-meteo.com/*`、`https://geocoding-api.open-meteo.com/*`。用户点击“启用天气”时直接请求权限；网页模式明确走普通 fetch，不伪造扩展授权。
- [ ] 城市查询使用 `/v1/search?name=...&count=5&language=zh&format=json`；天气使用 `/v1/forecast`，指定纬经度和 current 的 `temperature_2m,weather_code,is_day`，temperature_unit=celsius，timezone=auto。
- [ ] 仅发送城市查询或坐标；请求超时 8 秒，城市输入防抖 300ms，取消旧请求。校验 HTTP 状态和响应字段；缺失/非有限温度显示不可用，不转成 0°C。
- [ ] 显示未配置、加载、成功、缓存过期、失败重试和撤权状态；注明 Open-Meteo 来源。页面恢复可见时检查缓存，同一标签页去重正在进行的请求。
- [ ] 运行 `npm test -- tests/weather.test.ts tests/weather-widget.test.tsx`；以真实城市请求单独验证接口连通性和来源标注，记录结果，通过后提交 `feat: add optional city weather`。

## 任务 10：整合首页、管理视图与视觉对照

**文件：** 修改 `src/app/App.tsx`、`App.module.css`、各模块 CSS、`src/styles/`；创建 `tests/e2e/navigation.spec.ts`、`tests/e2e/responsive.spec.ts`、`tests/fixtures.ts`、`design-qa.md`。

**接口：** App 使用已实现的模块、Repository、导航及布局。测试 fixtures 通过测试启动流程注入，不添加生产演示开关或真实用户数据回填。

- [ ] 编写浏览器验收用例：在所有目标尺寸无横向溢出，核心内容不重叠，导航来回保存内容不丢失，弹层可键盘关闭并恢复焦点。
- [ ] 组合首页、完整网站/待办/便签管理视图、壁纸/设置侧栏；空状态提供简短状态和直接操作，不展示功能宣传或大段使用说明。
- [ ] 使用已选图片与同尺寸截图共同对照，检查横幅、两栏比例、字体、间距、素材、分隔线及 hover/focus 状态。图中搜索“命令”和空气质量按已批准规格不实现。
- [ ] 按 Product Design design-qa 流程记录截图和差异，修复影响使用与主要视觉还原的问题；记录最终通过或受阻状态，不用 HTTP 200 替代视觉验收。
- [ ] 运行 `npm run test:e2e:web -- navigation responsive`；通过后提交 `feat: finish new tab views and responsive layout`。

## 任务 11：完整验证、扩展打包与中文交付

**文件：** 创建 `tests/e2e/storage.spec.ts`、`tests/e2e/extension.spec.ts`、`tests/e2e/weather.spec.ts`、`tests/e2e/wallpaper.spec.ts`、`README.md`、`docs/verification.md`；完善 Playwright 配置与 `scripts/check-build.mjs`。

**接口：** 网页测试使用独立端口和测试存储；扩展测试加载 `dist/`，使用独立临时 profile，不操作用户日常浏览器数据。

- [ ] 网页浏览器测试覆盖搜索/输入法、站点分组/排序、待办跨日、便签恢复、布局保存/取消、图片损坏/超限、天气缓存/撤权/超时及离线本地编辑。
- [ ] 编写真实扩展测试：读取新标签页真实 URL 确认覆盖生效，打开两个页面修改不同任务，重载与重新启动同一测试 profile 后数据仍在，检查无 CSP/资源加载错误。
- [ ] Playwright 官方文档说明扩展自动化应使用持久上下文和支持加载扩展的 Chromium；使用其内置 Chromium 进行自动化。实际 Chrome/Edge 手动加载 `dist/` 验证另列结果，不把 Chromium 结果宣称为两个品牌浏览器均已通过。
- [ ] 扩展本身无后台 worker，因此不要使用等待 worker 来获得扩展 id；通过访问新标签页重定向后的扩展 URL 获取。若浏览器版本不支持自动加载，记录证据并提供真实浏览器加载检查步骤。
- [ ] 执行 `npm run typecheck`、`npm test`、`npm run build`、`npm run test:e2e:web`、`npm run test:e2e:extension`。各命令必须实际成功才标记通过；失败定位修复后只重跑相关及受影响检查。
- [ ] 发起独立代码审查，优先检查存储竞态、草稿队列、URL 判定、权限、布局保存和打包路径；修复实质问题，记录残余限制。没有可用审查代理时明确记录自审。
- [ ] 编写 README：Node 要求、npm 安装/开发/构建/测试命令、Chrome/Edge 加载未打包扩展步骤、网页与扩展数据独立、卸载会移除数据、天气联网范围及排障。
- [ ] 在 docs/verification.md 记录日期、命令结果、使用的浏览器及版本、截图位置、离线验证与未完成项；最终 Git 提交只包含本项目文件，不添加依赖或构建目录。
- [ ] 启动本地开发服务器，端口占用时换端口，以 HTTP 请求验证实际地址并在浏览器打开；交付可访问预览 URL、`dist/` 位置和验证摘要。运行服务可保留，测试和构建进程必须结束。

## 规格覆盖与执行方式

| 规格部分 | 实施任务 |
| --- | --- |
| 视觉、导航与响应式 | 1、10 |
| 搜索及站点 | 3、4、7 |
| 待办与便签 | 5、6 |
| 布局拖拽 | 7 |
| 时间、壁纸、设置 | 8 |
| 天气与联网权限 | 9 |
| 本地保存、初始化、跨标签页 | 2、6、11 |
| 异常、扩展安装及交付 | 1–11，最终汇总于 11 |

计划自检：已覆盖规格全部功能；Review Focus 的五项均有归属测试；公共接口在任务 2 定义并在后续复用；设计稿与演示数据分开；网页、自动化 Chromium 和 Chrome/Edge 实际安装验收分开记录。

推荐执行方式：主代理在当前任务顺序实施，最后由独立代理审查。任务共享存储、类型与布局接口，顺序实现便于及时验证；也可按 Superpowers 子代理流程逐任务实施与审查，但会增加上下文和审查成本。

## 文档依据

- [Vite 构建与相对资源路径](https://vite.dev/guide/build)
- [dnd-kit sortable API（所选包对应 legacy 文档）](https://dndkit.com/legacy/presets/sortable/overview/)
- [Playwright 扩展测试](https://playwright.dev/docs/chrome-extensions)
- [Open-Meteo 城市查询](https://open-meteo.com/en/docs/geocoding-api)
- 其他浏览器 API 与天气来源见已确认规格第 8 节。
