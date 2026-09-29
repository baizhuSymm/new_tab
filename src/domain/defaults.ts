import type { Layout, Settings, Shortcut } from "./types";
export const defaultSettings: Settings = {
  searchEngine: "bing",
  openTarget: "current",
  hourFormat: "24",
  recordRecent: true,
  city: null,
  wallpaper: "city",
  positionX: 50,
  positionY: 50,
  theme: "light",
  wallpaperId: "city",
  wallpaperPositions: { city: { positionX: 50, positionY: 50 } },
};
export const defaultLayout: Layout = {
  version: 1,
  modules: [
    { id: "shortcuts", column: "left", order: 0, visible: true },
    { id: "tasks", column: "right", order: 0, visible: true },
    { id: "notes", column: "right", order: 1, visible: true },
    { id: "recent", column: "full", order: 0, visible: true },
  ],
};
const sites = [
  ["Google", "https://www.google.com/", "google"],
  ["YouTube", "https://www.youtube.com/", "youtube"],
  ["GitHub", "https://github.com/", "github"],
  ["Notion", "https://www.notion.so/", "notion"],
  ["ChatGPT", "https://chatgpt.com/", "openai"],
  ["知乎", "https://www.zhihu.com/", "zhihu"],
  ["微信网页版", "https://wx.qq.com/", "wechat"],
  ["小红书", "https://www.xiaohongshu.com/", "xiaohongshu"],
  ["哔哩哔哩", "https://www.bilibili.com/", "bilibili"],
  ["网易云音乐", "https://music.163.com/", "neteasecloudmusic"],
  ["腾讯文档", "https://docs.qq.com/", "tencentqq"],
  ["飞书", "https://www.feishu.cn/", "lark"],
  ["Gmail", "https://mail.google.com/", "gmail"],
  ["Google 日历", "https://calendar.google.com/", "googlecalendar"],
  ["百度", "https://www.baidu.com/", "baidu"],
  ["淘宝", "https://www.taobao.com/", "taobao"],
  ["京东", "https://www.jd.com/", "jd"],
  ["豆瓣", "https://www.douban.com/", "douban"],
];
export const seedShortcuts: Shortcut[] = sites.map(
  ([name, url, icon], order) => ({
    id: `seed-${icon}`,
    name,
    url,
    icon,
    groupId: "default",
    order,
    updatedAt: 0,
  }),
);
