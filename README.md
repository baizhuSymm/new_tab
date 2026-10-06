# 拾页 · 个人新标签页

React + TypeScript + 原生 Vite 的本地新标签页。无账号、无后端，支持搜索、网站管理与排序、工具中心、浏览历史、待办、便签、布局编辑、自定义壁纸和可选天气。

## 本地运行

本次开发验证使用 Node.js 24.19.0 和 npm 11.17.0。建议使用 Node 24 LTS。

```powershell
npm ci
npm run dev
```

在终端显示的本地地址打开网页。网页预览的数据位于当前源的 localStorage；扩展数据位于 chrome.storage.local，二者不互通。

如果依赖已经安装，但终端提示找不到 `npm`，可临时运行以下项目内入口，无需改动全局配置：

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
node scripts/build.mjs
```

首次安装依赖仍需要可用的 npm；此备用命令不会安装或修复全局 npm。

## 加载扩展

```powershell
npm run build
```

1. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`。
2. 开启“开发者模式”，选择“加载已解压的扩展程序”。
3. 选择本项目生成的 `dist` 文件夹，而不是项目根目录。
4. 新开普通标签页。浏览器如询问是否保留新标签页更改，选择保留。

修改代码后重新构建，在扩展管理页点击刷新，再打开新标签页。本版不承诺覆盖无痕新标签页，不包含商店发布。

## 数据与权限

- 网站操作集中在首页：所有已保存网站直接展示，平时可拖动排序；点击“整理网站”后可编辑或删除，删除前需要确认。新增网站也在首页完成。

- 默认只申请 `storage` 权限；浏览历史和网站图标分别使用 `history`、`favicon` 可选权限，由用户在首页主动启用。不注入其他网页。
- 网站、任务、便签分实体保存；同一实体同时编辑按最后一次成功保存生效，不是多人协同编辑器。
- 便签草稿约 300ms 自动保存，冲突时明确选择保留本地或载入已保存内容。强制关闭浏览器前尚未成功写入的文字不能保证恢复。
- 首页浏览历史从 Chrome 读取最近访问的网页，最多显示 20 条；记录不另存入应用数据。普通网页预览无法读取浏览器历史，点击“查看全部”可打开 Chrome 自带的历史记录页。
- 壁纸支持 PNG/JPEG/WebP，原文件上限 20 MB、4000 万像素，压缩为 WebP 后不超过 1,500,000 字节。
- 天气默认关闭。启用时申请 Open-Meteo 两个域名的可选权限，只发送城市查询或坐标，不发送任务、便签、网站数据。
- 删除扩展、清除站点存储会丢失本地数据。本版没有云备份、导入导出。

## 验证

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e:web
npm run test:e2e:extension
```

请顺序执行两个 Playwright 套件，避免共用报告目录相互清理。扩展套件使用独立临时 profile，不操作你的日常浏览器资料。可用 `EXTENSION_CHROMIUM_PATH` 指定支持加载扩展的 Chromium 可执行文件。

**本机验证说明：** Playwright 自带 Chromium 在 Windows 进程启动阶段报 `spawn UNKNOWN`；指定本机 Edge 可执行文件后，扩展自动化已通过。Chrome 的实际加载仍需单独验证。详细证据见 `docs/verification.md`。

## 项目结构

- `src/features/`：搜索、网站、工具、浏览历史、待办、便签、布局、壁纸、设置、天气。
- `src/data/`：存储校验、初始化、读写锁和领域保存操作。
- `src/platform/`：网页与扩展存储、可选权限。
- `public/manifest.json`：Manifest V3 清单；无后台脚本。
- `docs/superpowers/`：已确认的设计与实施计划。
- `design-qa.md`：设计对照与响应式验收。
- `docs/assets.md`：生成素材、品牌图标和天气来源。
