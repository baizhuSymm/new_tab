# 首页日程与个性化功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Implemented on `codex/home-enhancements`; browser-extension launch remains environment-blocked and is not marked verified.

**Goal:** 按已确认布局，为新标签页加入日程管理、分组Tab、主题/壁纸库和固定左右栏组件管理，同时保留现有数据与交互。

**Architecture:** 保留 React + TypeScript + Vite、CSS Modules、`AppProvider` 和 `Repository` 边界。先增加日程和外观存储并从 schema v1 迁移到 v2，再分别开发分组Tab、日程和壁纸/主题界面，最后将它们整合进固定两栏布局。各个子系统分阶段实现、独立测试，最后统一做整合回归。

**Tech Stack:** React 19、TypeScript、Vite、CSS Modules、Vitest、React Testing Library、Playwright；不增加运行时依赖。

**Spec:** `docs/superpowers/specs/2026-09-28-home-enhancements-design.md`

## Global Constraints

- 继续使用现有 React + TypeScript + Vite、CSS Modules 和本地存储架构。
- 日程用具体日期、开始/结束时间和标题/描述管理；不制作日历组件、日期网格或月历视图。
- 不制作计算器；保留现有唯一的 OpenClaw 入口，不增加其它 AI 工具入口。
- 首页固定为左侧网站管理/最近打开，右侧日程/待办/快速记录；模块不可跨栏。
- 主题提供浅色/深色；壁纸来自内置图片或用户本地上传，不加载远程壁纸推荐。
- 不创建系统闹钟、不发送通知、不连接外部日历服务，不增加账号、后端或云同步。
- 保持实体独立保存和失败恢复行为；迁移不得覆盖网站、分组、任务、便签或壁纸。
- 在 1440×1024、1024×768、390×844 和 320px 宽度验证，无页面横向溢出。

## Review Focus

- schema v1 迁移须保留所有用户记录和自定义壁纸裁切；Task 1 添加回归测试。
- 多张壁纸接近浏览器存储配额时，保存失败不得改变当前主题/壁纸；Task 4 注入配额错误验证回滚和反馈。
- 日程结束时间早于开始时间、无效日期或本地时区转换跨日时，应阻止错误保存并保留表单输入；Task 3 添加验证测试。
- 分组Tab的键盘操作、活动分组删除和 320px 横向空间不足时仍可用；Task 2 添加键盘/窄屏测试。
- 布局迁移、隐藏/重排和取消编辑不得丢失业务数据或允许模块跨栏；Task 5 添加迁移及编辑回归测试。

---

## Task 1: 本地数据模型与 schema v2 迁移

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/defaults.ts`
- Modify: `src/data/validate.ts`
- Modify: `src/data/repository.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Add `ScheduleEvent` with `id`, `title`, `startAt`, nullable `endAt`, nullable `description`, `order`, `updatedAt`.
- Add `schedule` and `wallpaper` to `EntityMap`; expose `schedules` and custom `wallpapers` on `AppSnapshot`.
- Add `theme: "light" | "dark"`, `wallpaperId: string` and `wallpaperPositions: Record<string, { positionX: number; positionY: number }>` to `Settings`.
- Keep legacy wallpaper fields on `Settings` and `AppSnapshot` through Task 4 so the existing app compiles while consumers migrate.
- Add `Repository.save/remove("schedule", ...)`, generic wallpaper asset save/remove, and atomic `applyWallpaperId(wallpaperId, { positionX, positionY })`; retain current wallpaper APIs until Task 4.
- Migrate schema v1 to v2 without changing the current `Layout` shape. Mirror an existing custom wallpaper into the asset collection and seed the new selected id/crop map from its existing selection/crop.

- [ ] **Step 1: Write failing storage migration and schedule entity tests**
  - Add `upgrades schema v1 while preserving sites, tasks, notes, settings and custom wallpaper`.
  - Assert `load()` returns schema v2, old records retain ids/content, theme defaults to light, and the old custom wallpaper and crop remain selectable.
  - Add `saves, sorts and removes schedule entities without overwriting other entities`.
  - Add `rejects invalid schedule date ranges and oversized schedule text without writing`.
- [ ] **Step 2: Run the focused tests and verify the expected failures**

Run: `node node_modules/vitest/vitest.mjs run tests/storage.test.ts`

Expected: the new tests fail because schema v2, schedule validation and generic wallpaper assets do not exist.

- [ ] **Step 3: Implement schema v2 types, validation, repository and migration**
  - Make migration idempotent; write only new defaults/migrated keys and preserve unrelated keys.
  - Validate event timestamps, title/description bounds, order and `endAt > startAt` when an end exists.
  - Load schedule and wallpaper entity collections in the snapshot; sort schedules by start time.
  - Make wallpaper-id plus per-wallpaper crop updates atomic; a failed write leaves prior settings/assets untouched.
- [ ] **Step 4: Run repository tests**

Run: `node node_modules/vitest/vitest.mjs run tests/storage.test.ts`

Expected: schema migration, schedule persistence and existing repository invariants pass.

- [ ] **Step 5: Commit the data contract**

```bash
git add src/domain/types.ts src/domain/defaults.ts src/data/validate.ts src/data/repository.ts tests/storage.test.ts
git commit -m "feat: add schedule and appearance storage"
```

## Task 2: Shortcut group tabs

**Files:**
- Modify: `src/features/shortcuts/ShortcutGrid.tsx`
- Modify: `src/features/shortcuts/shortcuts.module.css`
- Test: `tests/e2e/home-shortcuts.spec.ts`

**Interfaces:**
- Keep `ShortcutGrid({ onOpen })` and the existing `ShortcutGroup` repository API.
- Replace the conditional native select with a horizontal semantic `tablist`; each tab has `aria-selected`, roving `tabIndex`, and Left/Right/Home/End navigation.
- Creating a group selects it; deleting the active group falls back to `default`.

- [ ] **Step 1: Add failing tab tests**
  - Verify tabs appear above the site grid and only the active group's sites render.
  - Verify arrow/Home/End navigation moves selection and focus.
  - Verify create-select and delete-active fallback behavior.
  - Verify the tab strip can scroll at 320px without page-level horizontal overflow.
- [ ] **Step 2: Run the focused tests and verify they fail against the current select**

Run: `node node_modules/@playwright/test/cli.js test tests/e2e/home-shortcuts.spec.ts --project=web -g "group tabs"`

Expected: FAIL because the group control is currently a select.

- [ ] **Step 3: Implement accessible horizontal group tabs**
  - Keep existing group create/rename/delete and site-move flows; position their controls alongside the tab row.
  - Add horizontal overflow styling to the tab strip without adding page overflow.
- [ ] **Step 4: Run the shortcut E2E suite**

Run: `node node_modules/@playwright/test/cli.js test tests/e2e/home-shortcuts.spec.ts --project=web`

Expected: group tabs and existing shortcut CRUD/reorder/open tests pass.

- [ ] **Step 5: Commit shortcut tabs**

```bash
git add src/features/shortcuts/ShortcutGrid.tsx src/features/shortcuts/shortcuts.module.css tests/e2e/home-shortcuts.spec.ts
git commit -m "feat: switch shortcut groups with tabs"
```

## Task 3: Schedule management

**Files:**
- Create: `src/features/schedule/SchedulePanel.tsx`
- Create: `src/features/schedule/schedule.module.css`
- Create: `src/features/schedule/scheduleDates.ts`
- Test: `tests/schedule.test.ts`
- Test: `tests/schedule-panel.test.tsx`

**Interfaces:**
- Consume `ScheduleEvent` and repository generic schedule save/remove from Task 1.
- Export `sortUpcomingSchedules(events: ScheduleEvent[], now: number): ScheduleEvent[]` and `toLocalDateTimeInput(iso: string): string`; save instants as ISO timestamps and display using the browser's local timezone.
- The homepage module preview includes entries whose end time, or start time when no end exists, has not passed; order them by start time.
- Export `SchedulePanel()` with inline add/edit dialog and an “全部日程” dialog for past and future items.

- [ ] **Step 1: Write failing date-logic and component tests**
  - Test chronological sorting and exclusion of ended items from the homepage preview.
  - Test ISO/local input conversion, invalid dates and reversed start/end validation.
  - Test create, edit, delete, empty state, all-schedules view and preserving invalid form values after errors.
  - Assert no calendar grid, month view or recurring event controls render.
- [ ] **Step 2: Run schedule tests and verify they fail because the module is missing**

Run: `node node_modules/vitest/vitest.mjs run tests/schedule.test.ts tests/schedule-panel.test.tsx`

Expected: FAIL because schedule helpers and component do not exist.

- [ ] **Step 3: Implement schedule list, editor and all-items dialog**
  - Show nearest upcoming entries with start date/time, optional end time and description.
  - Use plain date/time form fields; do not render a calendar component or recurring-event controls.
  - Keep past records accessible only in the all-schedules dialog until explicitly deleted.
- [ ] **Step 4: Run schedule and repository tests**

Run: `node node_modules/vitest/vitest.mjs run tests/schedule.test.ts tests/schedule-panel.test.tsx tests/storage.test.ts`

Expected: schedule behavior and persistence tests pass.

- [ ] **Step 5: Commit schedule management**

```bash
git add src/features/schedule tests/schedule.test.ts tests/schedule-panel.test.tsx
git commit -m "feat: add local schedule management"
```

## Task 4: Themes and local wallpaper library

**Files:**
- Create: `src/domain/wallpapers.ts`
- Create: two optimized bitmap assets under `public/wallpapers/` in addition to the current city panorama.
- Modify: `src/features/settings/SettingsPanel.tsx`
- Modify: `src/features/wallpaper/WallpaperPanel.tsx`
- Modify: `src/features/wallpaper/prepareWallpaper.ts`
- Modify: `src/features/wallpaper/wallpaper.module.css`
- Modify: `src/styles/global.css`
- Modify: `src/app/App.tsx`
- Test: `tests/wallpaper.test.ts`
- Test: `tests/wallpaper-panel.test.tsx`
- Test: `tests/app.test.tsx`

**Interfaces:**
- Consume theme, selected wallpaper id, per-id crop map and wallpaper assets from Task 1.
- Export `builtinWallpapers` metadata with stable ids and bundled paths, plus `getWallpaperPosition(settings, id)` defaulting to `{ positionX: 50, positionY: 50 }`.
- `WallpaperPanel` displays all built-ins and saved uploads; applying persists the id and that wallpaper's crop.

- [ ] **Step 1: Write failing theme and gallery tests**
  - Verify light/dark preference persists and applies root `data-theme` variables.
  - Verify built-in images resolve locally and appear in the wallpaper gallery.
  - Verify multiple custom uploads persist independently and each crop position survives switching away and back.
  - Inject storage quota failure; assert old selection/assets stay intact and an error is shown.
  - Verify deleting the active upload requires selecting another wallpaper first, then falls back safely.
- [ ] **Step 2: Run the tests and verify missing theme/gallery behavior**

Run: `node node_modules/vitest/vitest.mjs run tests/wallpaper.test.ts tests/wallpaper-panel.test.tsx tests/app.test.tsx`

Expected: FAIL on theme persistence and multi-asset selection behaviors.

- [ ] **Step 3: Implement theme variables and the local wallpaper gallery**
  - Add two generated, optimized bitmap alternatives alongside `city-panorama.png`; keep every image packaged locally.
  - Preserve PNG/JPEG/WebP validation and compression; quota failure must not replace the active wallpaper.
  - Update the app shell to resolve `wallpaperId` and its per-id crop; remove legacy singular-wallpaper consumers only after migrated assets load correctly.
  - Add accessible light/dark selection, gallery preview/select/delete, and retain crop controls.
- [ ] **Step 4: Run wallpaper and application tests**

Run: `node node_modules/vitest/vitest.mjs run tests/wallpaper.test.ts tests/wallpaper-panel.test.tsx tests/app.test.tsx tests/storage.test.ts`

Expected: migration, theme, gallery, crop and quota error tests pass.

- [ ] **Step 5: Commit theme and wallpaper library**

```bash
git add src/domain/wallpapers.ts src/features/settings/SettingsPanel.tsx src/features/wallpaper src/styles/global.css src/app/App.tsx public/wallpapers tests/wallpaper.test.ts tests/wallpaper-panel.test.tsx tests/app.test.tsx
git commit -m "feat: add theme and wallpaper library"
```

## Task 5: Fixed two-column layout and component manager

**Files:**
- Modify: `src/domain/types.ts`
- Modify: `src/domain/defaults.ts`
- Modify: `src/data/validate.ts`
- Modify: `src/data/repository.ts`
- Modify: `src/features/layout/layout.ts`
- Modify: `src/features/layout/ModuleGrid.tsx`
- Modify: `src/features/layout/layout.module.css`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.module.css`
- Modify: `src/features/recent/RecentStrip.tsx`
- Test: `tests/layout.test.ts`
- Test: `tests/storage.test.ts`
- Create: `tests/e2e/home-enhancements.spec.ts`

**Interfaces:**
- Upgrade persisted `Layout` v1 to v2; final module ids are `shortcuts`, `recent`, `schedule`, `tasks`, `notes`, with only `left` and `right` columns.
- Default left order is shortcuts then recent; right order is schedule, tasks, notes.
- `moveModule(layout: Layout, id: ModuleId, index: number): Layout` may reorder a module within its assigned column only.
- `ModuleGrid` receives all five module children and keeps save/cancel/visibility controls.

- [ ] **Step 1: Write failing layout migration and homepage integration tests**
  - Verify v1 layouts migrate to the fixed columns, preserve existing visible/order preferences where possible, move recent left, and add visible schedule right.
  - Verify module ids/order and that the layout exposes no full-width or cross-column destination.
  - Verify hide/show, save, cancel and restore default preserve schedule and all existing entities.
  - Verify home order: OpenClaw above content; left shortcuts then recent; right schedule, tasks, notes; no calendar or calculator.
  - Verify no horizontal overflow at 1440, 1024, 390 and 320px.
- [ ] **Step 2: Run focused tests and verify failure against current four-module/full-width layout**

Run: `node node_modules/vitest/vitest.mjs run tests/layout.test.ts tests/storage.test.ts` and `node node_modules/@playwright/test/cli.js test tests/e2e/home-enhancements.spec.ts --project=web`

Expected: FAIL because schedule is not registered, recent is full-width, and v1 layouts permit cross-column moves.

- [ ] **Step 3: Implement layout v2 migration and fixed-column component management**
  - Convert `ModuleGrid` to two column-local sortable lists; remove full-width drop targets and column selectors.
  - Keep drag handles, keyboard up/down, visibility, save/cancel and restore-default behavior.
  - Wire `SchedulePanel` into the right column and `RecentStrip` below shortcuts in the left column.
  - In one-column responsive mode, render the complete left group before the right group.
- [ ] **Step 4: Run layout, migration and homepage E2E tests**

Run: `node node_modules/vitest/vitest.mjs run tests/layout.test.ts tests/storage.test.ts` and `node node_modules/@playwright/test/cli.js test tests/e2e/home-enhancements.spec.ts --project=web`

Expected: all layout migration, module ordering, editor and viewport assertions pass.

- [ ] **Step 5: Commit fixed homepage layout**

```bash
git add src/domain/types.ts src/domain/defaults.ts src/data/validate.ts src/data/repository.ts src/features/layout src/app/App.tsx src/app/App.module.css src/features/recent/RecentStrip.tsx tests/layout.test.ts tests/storage.test.ts tests/e2e/home-enhancements.spec.ts
git commit -m "feat: arrange homepage in fixed two-column modules"
```

## Task 6: Full verification and extension preview

**Files:**
- Modify: `tests/e2e/home-enhancements.spec.ts`
- Modify: `docs/verification.md` only for verification results actually run

- [ ] **Step 1: Run all unit and component tests**

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all Vitest suites pass.

- [ ] **Step 2: Run typecheck and production extension build**

Run: `node node_modules/typescript/bin/tsc --noEmit` and `node scripts/build.mjs`

Expected: no TypeScript errors; production build, manifest and packaged wallpaper asset checks pass.

- [ ] **Step 3: Run browser regression**

Run: `node node_modules/@playwright/test/cli.js test tests/e2e/home-enhancements.spec.ts tests/e2e/app.spec.ts --project=web`

Expected: desktop and 1024/390/320 viewport checks pass without horizontal overflow or runtime errors.

- [ ] **Step 4: Verify extension data migration and offline assets**
  - Load the production extension in the available Chromium browser; verify schema v1 migration, local wallpaper rendering without network access, and persistence after reload.
  - Record only validations actually run in `docs/verification.md`; mark unavailable browser checks unverified.
- [ ] **Step 5: Review and commit final verification record**

```bash
git add tests/e2e/home-enhancements.spec.ts docs/verification.md
git commit -m "test: verify homepage schedule and personalization"
```

## Plan Self-Review

- Spec coverage: schedule CRUD/local time, no calendar/countdown/calculator, group tabs, theme/dark mode, local wallpaper library, fixed columns, component visibility/reordering, migration and viewport checks map to Tasks 1–6.
- Interface order: Task 1 defines schedule/settings/wallpaper persistence; Tasks 2–4 consume those APIs; Task 5 adds the schedule module id and integrates all features.
- The main risks are listed in Review Focus and each has a corresponding test in its owning task.
- Schedule, appearance and shortcut tabs are distinct sub-systems and could use separate plans; this umbrella plan keeps them together because final delivery shares the storage migration and homepage layout contract, while each task remains independently testable.
