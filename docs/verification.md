# 实施与验证记录

## 2026-10-06 当前项目合入 main 前验证

当前项目包含独立工具中心、首页工具栏、浏览器历史与网站图标，以及首页网站、日程、待办、便签布局调整。

| 检查 | 实际命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `node node_modules/typescript/bin/tsc --noEmit` | 退出码 0 |
| 单元与组件测试 | `node node_modules/vitest/vitest.mjs run` | 18 个文件，69/69 通过 |
| 生产扩展构建 | `node scripts/build.mjs` | Vite 构建及 manifest/入口/资源检查通过 |
| 网页浏览器测试 | `node node_modules/@playwright/test/cli.js test --project=web` | 47/47 通过 |
| 扩展浏览器测试 | 设置 `EXTENSION_CHROMIUM_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` 后运行 `node node_modules/@playwright/test/cli.js test --project=extension` | 1/1 通过：新标签覆盖、跨标签存储、重启恢复及 CSP 页面错误检查 |

Playwright 自带 Chromium 仍在启动前报 `spawn UNKNOWN`。本机 Edge 运行期间 Vite 曾对测试 profile 的缓存文件报告 `EBUSY`，但扩展测试本身通过；该 profile 是独立测试目录，未使用日常浏览器资料。可选历史与网站图标权限的真实弹窗尚未由扩展套件覆盖。

## 2026-09-29 首页日程与个性化

本次新增 schema v2 与布局 v2 迁移、网站分组 Tab、本地日程、主题/壁纸库和固定左右栏组件管理。此记录对应 `codex/home-enhancements` 分支。

| 检查 | 实际命令 | 结果 |
| --- | --- | --- |
| 单元与组件测试 | `node node_modules/vitest/vitest.mjs run` | 13 个文件，43/43 通过 |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | 退出码 0 |
| 生产扩展构建 | `node scripts/build.mjs` | Vite 构建及 manifest/入口/资源检查通过 |
| 网页浏览器测试 | `node node_modules/@playwright/test/cli.js test --project=web` | 31/31 通过 |
| 扩展浏览器测试 | `node node_modules/@playwright/test/cli.js test tests/e2e/extension.spec.ts --project=extension` | 未能启动 Chromium：`spawn UNKNOWN`；扩展页面未加载，不能视为扩展验收通过 |

网页测试验证固定左栏（网站、最近打开）与右栏（日程、待办、便签），组件显隐、栏内排序、取消/保存、分组 Tab 键盘操作及 1487、1440、1366、1024、390、320px 视口。壁纸图片为本地打包资源；真实扩展新标签覆盖、`chrome.storage` 跨标签/重启行为和 CSP 控制台仍待手动验收。

真实扩展启动错误发生在页面加载前，和扩展功能行为无关；未改动系统程序集或用户的 Chrome/Edge 配置。网页自动化和构建结果不能替代真实浏览器扩展验收。

## 既有验证记录（2026-09-27）

日期：2026-09-27。结论：网页预览和生产构建已通过验证；扩展真实加载验收仍受环境阻塞，不能称为 Chrome/Edge 已验收。

## 网站样式微调复验

2026-09-27：操作角标改为无边框透明底、悬停或键盘聚焦时显示半透明圆底；网站图标增至 48px，桌面行距缩至 12px，窄屏为 10px。

- `node node_modules/@playwright/test/cli.js test tests/e2e/home-shortcuts.spec.ts --project=web`：6/6 通过，19.4 秒。包括尺寸、透明/悬停背景、无边框、圆形、布局稳定及鼠标/键盘/触摸回归。
- `node scripts/build.mjs`：类型检查、生产构建和扩展入口静态检查通过，`dist` 已更新。
- 实际查看桌面悬停截图 `docs/qa/home-edit-hover.png` 和 390px 窄屏截图，无角标或名称重叠。预览 HTTP 200。
- 此次仅运行相关网页套件，未重跑全套单元测试或真实扩展加载测试；下表为此前完整回归记录。

## 此前完整回归

| 检查 | 实际命令 | 结果 |
| --- | --- | --- |
| 单元与组件测试 | `node node_modules/vitest/vitest.mjs run` | 10 个文件，25/25 通过 |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | 退出码 0 |
| 完整生产构建 | `node scripts/build.mjs` | 类型检查、Vite 构建、入口检查全部通过 |
| 网页浏览器测试 | `node node_modules/@playwright/test/cli.js test --project=web` | 25/25 通过，56.5 秒 |
| 扩展浏览器测试 | `node node_modules/@playwright/test/cli.js test --project=extension` | 1 项未通过，浏览器进程尚未启动成功 |
| 预览 HTTP | `Invoke-WebRequest http://127.0.0.1:5173/` | 200 |

Node 24.19.0；React 19.3.0；Vite 8.3.1；Playwright 1.63.0。网页测试运行 Chrome Headless Shell 153.0.8010.12。会话恢复后本机 npm 命令不可用，因此最终验证改为调用已安装依赖的 Node 入口；没有修改全局 Node/npm 安装。

## 实际覆盖

- 初始化读失败不重置、删除默认网站不重新填充、非法数据拒绝写入、配额异常保留数据。
- 两个页面分别编辑任务、实时同步、刷新恢复；任务完成/撤销及本地午夜重新分类。
- 网站添加/编辑/移动分组、鼠标排序、并发分组删除的旧表单保护、排序不复活已删除记录。
- 首页集中管理网站，无独立网站管理 Tab、分类小字或品牌页脚；普通模式拖动不误打开且顺序持久化，键盘排序和正常点击可用；角标编辑、删除取消/确认及刷新后删除结果保留。
- 1440、894、390、320 像素宽度下整理模式角标无重叠，切换整理前后网站位置不变；截图为 `docs/qa/home-edit-*.png`。本次重新打包 `dist`，未重复宣称通过真实扩展加载验收。
- 复核发现的 Enter 被排序占用、触屏滑动被拦截均先由新增测试复现，再修正为 Enter 打开、空格排序，以及触屏长按激活。CDP 触摸输入验证普通滑动滚动页面且不改顺序、长按移动后保存顺序；不等同于实体手机验收。
- URL 正规化、危险协议拒绝、中文输入法回车、键盘本地匹配、新标签打开。
- 草稿 300ms 延迟保存、刷新恢复、提交幂等 id、失败保留内容；队列失效与 CAS 防旧写；未解决冲突跨管理视图保留。
- 布局鼠标跨列移动、无效区域放下取消、键盘排序、取消/保存、隐藏后恢复、手机编辑工具不溢出。
- 真正解码壁纸、损坏文件拒绝、格式/容量校验；图片与偏好统一保存，网页适配器按逆序回滚失败的多键写入。
- 无网络时待办可编辑，恢复网络刷新后仍存在。
- 天气首次未配置不请求，缓存复用、切换城市、迟到响应不覆盖新城市、联网失败保留缓存；可选权限的适配器单元测试。
- 12/24 小时切换；设置弹层焦点循环、Escape 关闭和焦点返回。
- 1487、1440、1366、1024、390、320 像素宽度截图，无页面横向溢出，壁纸真实加载；截图套件未捕获 pageerror。

网页自动化使用独立上下文和测试注入数据，真实初始数据不包含测试任务、便签、城市或最近记录。

## 真实天气连通性

对上海坐标 `31.22,121.46` 实际调用 Open-Meteo forecast 接口成功，返回 `timezone=Asia/Shanghai`、有效的当前温度/天气代码/昼夜字段。此结果仅说明当次请求可达，不保证未来可用性。UI 保留 Open-Meteo 来源链接，免费接口用于本项目的个人非商业用途。

## 审查及回归

独立审查代理 Dirac 找到 2 项 P1、4 项 P2，复核又发现 2 项 P2。全部按复现路径补测试并修复：草稿队列冲突、孤立分组记录、排序覆盖旧快照、导航丢弃冲突草稿、壁纸半提交、搜索历史范围、失败提交标记、配额回滚顺序。

最后两项修复的针对性测试为 6/6 通过，全套为 25/25 通过。会话恢复后原审查代理已不可访问，最后两项修复不宣称获得第三轮独立复核；主代理已核对代码和红绿回归证据。

## 扩展验收阻塞

完整 Chromium 153.0.8010.12 和备用 Chromium 140.0.7339.186 都在 Windows 启动阶段失败：

```text
browserType.launchPersistentContext: spawn UNKNOWN
应用程序无法启动，因为应用程序的并行配置不正确。
SideBySide: 找不到从属程序集 153.0.8010.12 / 140.0.7339.186。
```

错误发生在扩展页面加载前，不是扩展成功或失败的证据。没有更改系统程序集配置，也未操作日常 Chrome/Edge profile。

尚未确认：真实扩展的新标签覆盖、chrome.storage 的跨标签及重启恢复、可选权限弹窗/撤权、生产扩展 CSP 控制台检查。打包路径静态检查不能替代这些运行检查。

手动验收步骤：

1. 按 README 在 Chrome 或 Edge 加载 `dist`，打开普通新标签页，确认显示拾页。
2. 新建待办与便签，打开第二个新标签页核对同步；重启浏览器确认仍在。
3. 启用天气时拒绝一次授权，再允许，核对两种状态；删除权限后核对重新授权提示。
4. 断网后新建本地内容；确认页面、图标与壁纸仍可用。
5. 扩展开发者工具中检查无 CSP 错误或资源 404。Chrome 与 Edge 需分别记录结果。

## 视觉证据

见项目根目录 `design-qa.md`，截图位于 `docs/qa/`。设计截图含测试数据；用户第一次打开仍为空待办、空便签和未配置天气。
