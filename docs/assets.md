# 素材与来源

## 设计与生成素材

- 视觉基准：`docs/superpowers/specs/assets/selected-concept.png`，本次 Product Design 探索中用户选定的第三张图。
- `public/wallpapers/city-panorama.png`：ImageGen 按上海城市全景、清晨自然光、宽幅 3:1 单独生成，2172×724；不是将设计截图直接当作背景。
- `public/icon/icon.png`：ImageGen 生成的绿色窗口/书签图标，1254×1254，随扩展打包。
- 原始生成记录：资产代理 `01a0dd7e-f235-7a62-8a67-134fe32605fd`，生成文件 `exec-5d815c2e-cf67-4fa7-9798-baf80e79c11a.png`（横幅）、`exec-8733bba3-adba-440c-b000-11f8fc6875fb.png`（图标）。

## 网站与界面图标

- 网站 favicon 在开发阶段从 Google S2 favicon 服务获取后打包到 `public/site-icons/`。域名及获取方式见 `scripts/fetch-icons.mjs`。运行时不会向第三方发送用户添加的网址。
- 微信、小红书、哔哩哔哩、Gmail 和 Google 日历使用 `@icons-pack/react-simple-icons` 的品牌图标，不使用手绘品牌近似图。其他内置品牌优先使用打包的 favicon。
- Google favicon 服务对 Gmail 和日历返回通用 Google 图标，因此改用对应品牌库图标；小红书返回 404，因此使用品牌库版本。
- 操作按钮和自定义站点的通用图标来自 Lucide React。品牌标识属于相应权利人，使用不表示关联或背书。
- 字体使用系统 `Segoe UI` / `Microsoft YaHei`；通过浏览器 CSS 调试协议实际确认渲染字体，不依赖在线字体。

## 联网来源

- 天气和城市查询：[Open-Meteo](https://open-meteo.com/)。页面保留来源链接。
- 本项目定位为个人非商业使用。免费服务的非商业范围和调用额度见 [Open-Meteo 使用条款](https://open-meteo.com/en/terms)；商业发布前需重新评估服务方案和品牌素材授权。
