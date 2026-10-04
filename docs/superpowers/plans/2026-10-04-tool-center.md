# Tool Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single OpenClaw entry into an ordered home tool bar and a separate tool center with four honest interaction demos.

**Architecture:** Keep tool metadata and panel components in one static registry. Persist only the ordered list of added tool IDs through the existing repository and storage adapters. Render the compact tool bar only for the home view; render the catalog and selected preview only for a new `tools` view.

**Tech Stack:** React 19, TypeScript, CSS Modules, Lucide icons, existing web/Chrome storage adapters, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-tool-center-design.md`

## Global Constraints

- 首页只显示已添加工具按钮和同尺寸、末尾可见的“添加”；工具中心是独立页面，绝不显示首页工具栏。
- 首版四个 ID 固定为 `openclaw`、`calculator`、`translator`、`document-converter`；只有现有 OpenClaw 本机控制台入口是真实动作，其余不能显示伪造结果。
- 默认仅添加 `openclaw`；新增 `toolSelection` 记录，不改写旧设置、布局和业务数据；保存失败维持旧选择。
- 保留城市壁纸、全局搜索、浅色/深色主题和现有首页模块。工具栏不进入“编辑布局”。
- 当前工作区已有用户未提交修改。执行时先检查相关文件的 diff；每次只暂存和提交本任务自己的文件或代码块。

## File Map

- `src/domain/tools.ts`: stable IDs, `ToolId`, known-ID guard and default selection.
- `src/domain/types.ts`: `ToolSelection` and `AppSnapshot`/`AppView` extensions.
- `src/data/validate.ts`, `src/data/repository.ts`: selection validation, legacy fallback and locked writes.
- `src/features/tools/registry.tsx`: one metadata/Panel registration point.
- `src/features/tools/panels/*.tsx`: four isolated operation panels; OpenClaw extracted from current `AiTools`.
- `src/features/tools/ToolBar.tsx`, `ToolCenter.tsx`, `tools.module.css`: home bar and dedicated catalog.
- `src/app/App.tsx`: view switch and navigation. Remove superseded `src/features/ai-tools/*` only after the new flow is wired.
- `tests/tool-selection.test.ts`, `tests/tool-panels.test.tsx`, `tests/tool-bar.test.tsx`, `tests/tool-center.test.tsx`, `tests/e2e/tools.spec.ts`: storage, honest demos and user journey.

## Review Focus

1. Two open tabs add different tools nearly together: both additions survive and IDs stay unique (Task 1 test).
2. A stored future tool ID is invisible now yet survives read-only load; malformed selection cannot overwrite existing data (Task 1 test).
3. An empty added list still shows a reachable “添加” control; removing the active tool closes its panel (Task 3 test).
4. A category switch hiding the selected preview selects the first visible tool, or shows an empty state (Task 4 test).
5. A long typed text or file name does not overflow a 320px viewport or process the selected file (Task 2 and Task 4 tests).

---

### Task 1: Store the added tool IDs safely

**Files:** Create `src/domain/tools.ts`, `tests/tool-selection.test.ts`; modify `src/domain/types.ts`, `src/data/validate.ts`, `src/data/repository.ts`.

**Interfaces:** Produce `ToolId`, `ToolSelection { version: 1; ids: string[] }`, `defaultToolSelection`, `isToolId(value: string): value is ToolId`, `validateToolSelection(value: unknown): asserts value is ToolSelection`, `AppSnapshot.toolSelection`, and `Repository.setToolAdded(id: ToolId, added: boolean): Promise<void>`.

- [ ] **Step 1: Write failing repository tests.** Use `memoryAdapter` to assert: absent v2 selection and a v1 upgrade load as `["openclaw"]` without changing other records; two repository instances can concurrently add `calculator` and `translator` with both present; repeated add produces one ID; removing leaves the requested order; unknown string IDs survive load until an explicit write; malformed records reject without mutation; injected write failure leaves the prior selection intact.
- [ ] **Step 2: Run `node node_modules/vitest/vitest.mjs run tests/tool-selection.test.ts`.** Expected: failures because the selection interfaces and method do not exist.
- [ ] **Step 3: Implement the interfaces above.** Validate version, array shape, unique nonempty string IDs, and a bounded list length while allowing unknown IDs on read. `load()` uses `defaultToolSelection` when the record is absent; `setToolAdded` reads the latest record inside the existing lock, filters to known IDs on explicit write, applies the requested change and writes only `toolSelection`. Do not bump the app schema version.
- [ ] **Step 4: Run the focused test and `npm run typecheck`.** Expected: pass.
- [ ] **Step 5: Commit only Task 1 files and review `git diff --cached --check` before commit.** Suggested message: `feat: persist selected tool IDs`.

### Task 2: Register four honest tool panels

**Files:** Create `src/features/tools/registry.tsx`, `src/features/tools/panels/OpenClawPanel.tsx`, `CalculatorPanel.tsx`, `TranslatorPanel.tsx`, `DocumentConverterPanel.tsx`, `tests/tool-panels.test.tsx`; modify or create `src/features/tools/tools.module.css` for shared panel styling. Keep old `AiTools` mounted until Task 4.

**Interfaces:** Consume `ToolId` and `isToolId`. Produce `ToolPanelProps { onClose?: () => void }`, `ToolDefinition { id: ToolId; label: string; description: string; category: "utility" | "text" | "file"; Icon: LucideIcon; Panel: ComponentType<ToolPanelProps> }`, `toolDefinitions: ToolDefinition[]`, and `getToolDefinition(id: ToolId): ToolDefinition`.

- [ ] **Step 1: Write failing component tests.** Verify all four IDs resolve to one definition; OpenClaw keeps the `OpenClaw 对话` region, disabled composer and console URL `http://127.0.0.1:18789/`; calculator key presses update the visible expression but `=` shows “计算功能尚未接入”; translator accepts long text and language changes but returns “翻译服务尚未接入”; document converter displays a chosen long file name without reading its content and shows “转换功能尚未接入”. Assert no fabricated numeric, translated or downloaded output.
- [ ] **Step 2: Run `node node_modules/vitest/vitest.mjs run tests/tool-panels.test.tsx`.** Expected: missing registry/panel failures.
- [ ] **Step 3: Implement the registry and panels.** Extract current OpenClaw markup and behavior without changing its console action. Use panel-local state for demos; add a visible “交互示例” label in preview mode at the host level, not inside every panel. Browser file input may access metadata (`name`, `type`) only.
- [ ] **Step 4: Run the focused test and `npm run typecheck`.** Expected: pass.
- [ ] **Step 5: Commit only Task 2 files after `git diff --cached --check`.** Suggested message: `feat: register tool interaction panels`.

### Task 3: Build the home tool bar

**Files:** Create `src/features/tools/ToolBar.tsx`, `tests/tool-bar.test.tsx`; extend `src/features/tools/tools.module.css`.

**Interfaces:** Consume `ToolSelection`, `isToolId`, `getToolDefinition`. Produce `ToolBar({ selection, onAdd }: { selection: ToolSelection; onAdd: () => void })`. The component owns one `activeId: ToolId | null` and exposes region IDs `tool-panel-${id}`.

- [ ] **Step 1: Write failing component tests.** Assert default OpenClaw and same-size “添加” render; an empty `ids` list still renders “添加”; clicking or pressing Enter on a tool opens its panel with `aria-expanded`, clicking again closes it, clicking another switches panels; removing the active ID through rerender closes the panel; the add button invokes `onAdd` and stays last.
- [ ] **Step 2: Run `node node_modules/vitest/vitest.mjs run tests/tool-bar.test.tsx`.** Expected: missing component failures.
- [ ] **Step 3: Implement `ToolBar`.** Resolve only known IDs, preserve saved order, render one horizontal scrollable button strip and a same-size always-visible plus button at its right edge; render at most one full-width panel below. Keep current OpenClaw button sizing and the 15px surrounding spacing.
- [ ] **Step 4: Run the focused test and `npm run typecheck`.** Expected: pass.
- [ ] **Step 5: Commit only Task 3 files after `git diff --cached --check`.** Suggested message: `feat: add configurable home tool bar`.

### Task 4: Add the separate Tool Center and connect the journey

**Files:** Create `src/features/tools/ToolCenter.tsx`, `tests/tool-center.test.tsx`, `tests/e2e/tools.spec.ts`; modify `src/app/App.tsx`, `src/domain/types.ts` (`AppView`), `src/features/tools/tools.module.css`, `tests/e2e/home-shortcuts.spec.ts` (old AI selector), `tests/e2e/app.spec.ts` if old region expectations need updating; delete `src/features/ai-tools/AiTools.tsx` and `ai-tools.module.css` after replacement. Update `tests/e2e/extension.spec.ts` with a small selection persistence assertion when browser execution is available.

**Interfaces:** Consume `ToolSelection`, `Repository.setToolAdded`, `toolDefinitions`, `ToolBar`. Produce `ToolCenter({ onBack }: { onBack: () => void })` using `useAppData()` and `AppView` extended with `"tools"`. `App` renders `<ToolBar selection={snapshot.toolSelection} onAdd={() => navigate("tools")} />` only on home; `tools` view renders `<ToolCenter onBack={() => navigate("home")} />` and no `ToolBar` or `ModuleGrid`.

- [ ] **Step 1: Write failing page and journey tests.** In RTL, start on home, use “添加” to open a distinct tool center with no home tool bar, select 翻译 and see its preview, add it, return home and find the new button, reload/remount and find it again, remove it in center and verify it disappears. Test category filtering, keyboard category selection, hidden-preview fallback, empty “常用” state, and a rejected save that leaves the old selection visible with an error. In Playwright, assert the same page separation at 1440px, dark theme rendering, 390px and 320px without horizontal document overflow, the add button reachable, a long translation input/file name contained, and focus restored on return home.
- [ ] **Step 2: Run `node node_modules/vitest/vitest.mjs run tests/tool-center.test.tsx` and `npx playwright test tests/e2e/tools.spec.ts --project=web`.** Expected: new flow failures.
- [ ] **Step 3: Implement the page and integration.** Add side-rail entry and back action; use list-plus-preview layout from the selected mock; `全部` shows all, `常用` shows added IDs, `文本` shows translator, `文件` shows converter. Selecting a row only changes preview; add/remove calls `run(() => repository.setToolAdded(...))` and leaves the user on Tool Center. On narrow screens place category tabs above one-column list and preview below. Keep global hero/search and existing home modules unchanged.
- [ ] **Step 4: Update old tests/selectors and run `npm run typecheck`, `npm test`, `npm run build`, then web Playwright.** Expected: pass. Run extension Playwright after build when a compatible Chromium is available; if the known Windows SideBySide launch error recurs, record that exact verification limit instead of claiming extension pass.
- [ ] **Step 5: Compare 1440×1024 Tool Center and 390×844 home screenshots with `docs/superpowers/specs/assets/tool-center-selected.png` and existing home QA; fix any visible layout mismatch, then commit only Task 4 changes after `git diff --cached --check`.** Suggested message: `feat: add dedicated tool center`.

## Final Check

Re-read the spec against the resulting UI: home contains only added tool buttons plus “添加”, Tool Center contains the catalog only, every demo declares its unconnected state, and no unrelated local edits entered task commits. Report actual test commands and any browser verification limits.
