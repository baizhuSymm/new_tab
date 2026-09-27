import {
  Globe,
  MessageCircle,
  FileText,
  ShoppingBag,
  Send,
} from "lucide-react";
import { useState } from "react";
import {
  SiGoogle,
  SiYoutube,
  SiGithub,
  SiNotion,
  SiZhihu,
  SiWechat,
  SiXiaohongshu,
  SiBilibili,
  SiNeteasecloudmusic,
  SiGmail,
  SiGooglecalendar,
  SiBaidu,
  SiTaobao,
  SiDouban,
} from "@icons-pack/react-simple-icons";
const brands = {
  google: SiGoogle,
  youtube: SiYoutube,
  github: SiGithub,
  notion: SiNotion,
  zhihu: SiZhihu,
  wechat: SiWechat,
  xiaohongshu: SiXiaohongshu,
  bilibili: SiBilibili,
  neteasecloudmusic: SiNeteasecloudmusic,
  gmail: SiGmail,
  googlecalendar: SiGooglecalendar,
  baidu: SiBaidu,
  taobao: SiTaobao,
  douban: SiDouban,
};
export function SiteIcon({ name, size = 32 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (
    name &&
    !["xiaohongshu", "gmail", "googlecalendar", "bilibili", "wechat"].includes(
      name,
    ) &&
    !failed &&
    /^[a-z]+$/.test(name)
  )
    return (
      <img
        src={`./site-icons/${name}.png`}
        alt=""
        width={size}
        height={size}
        style={{ objectFit: "contain", flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    );
  const Brand = brands[name as keyof typeof brands];
  if (Brand) return <Brand size={size} color="default" aria-hidden="true" />;
  const fallback = {
    openai: [MessageCircle, "#299b83"],
    tencentqq: [FileText, "#1684f5"],
    lark: [Send, "#1774e9"],
    jd: [ShoppingBag, "#e9222c"],
  } as const;
  const pair = fallback[name as keyof typeof fallback];
  const Icon = pair?.[0] ?? Globe;
  return (
    <Icon
      size={size}
      color={pair?.[1] ?? "#788b81"}
      strokeWidth={1.8}
      aria-hidden="true"
    />
  );
}
