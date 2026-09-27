import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
const sites = {
  google: "google.com",
  youtube: "youtube.com",
  github: "github.com",
  notion: "notion.so",
  openai: "chatgpt.com",
  zhihu: "zhihu.com",
  wechat: "wx.qq.com",
  bilibili: "bilibili.com",
  neteasecloudmusic: "music.163.com",
  tencentqq: "docs.qq.com",
  lark: "feishu.cn",
  gmail: "mail.google.com",
  googlecalendar: "calendar.google.com",
  baidu: "baidu.com",
  taobao: "taobao.com",
  jd: "jd.com",
  douban: "douban.com",
};
await mkdir("public/site-icons", { recursive: true });
for (const [slug, domain] of Object.entries(sites)) {
  const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error(String(response.status));
    const bytes = Buffer.from(await response.arrayBuffer());
    const meta = await sharp(bytes).metadata();
    if (!meta.width || meta.width < 16) throw Error("Empty icon");
    await writeFile(
      `public/site-icons/${slug}.png`,
      await sharp(bytes).png().toBuffer(),
    );
    console.log(slug, meta.width, meta.height);
  } catch (e) {
    console.error(`${slug}: ${e.message}`);
    process.exitCode = 1;
  }
}
