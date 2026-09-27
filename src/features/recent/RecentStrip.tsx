import { Trash2, ArrowUpRight } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { RecentEntry } from "../../domain/types";
import { SiteIcon } from "../shortcuts/SiteIcon";
import { IconButton } from "../../ui/IconButton";
import { useClock } from "../clock/useClock";
import styles from "./recent.module.css";
export function RecentStrip({
  onOpen,
}: {
  onOpen: (site: RecentEntry) => void;
}) {
  const { snapshot, repository, run } = useAppData();
  const now = useClock().getTime();
  function ago(time: number) {
    const minutes = Math.max(0, Math.floor((now - time) / 60000));
    return minutes < 1
      ? "刚刚"
      : minutes < 60
        ? `${minutes} 分钟前`
        : minutes < 1440
          ? `${Math.floor(minutes / 60)} 小时前`
          : `${Math.floor(minutes / 1440)} 天前`;
  }
  return (
    <section className={styles.strip} aria-label="最近打开">
      <h2>最近打开</h2>
      <div className={styles.items}>
        {snapshot.recent.map((site) => (
          <button
            className={styles.item}
            key={site.id}
            onClick={() => onOpen(site)}
            title={site.url}
          >
            <SiteIcon name={site.icon} size={25} />
            <span>
              {site.name}
              <small>{ago(site.openedAt)}</small>
            </span>
            <ArrowUpRight size={12} />
          </button>
        ))}
        {!snapshot.recent.length && (
          <p className="muted">
            {snapshot.settings.recordRecent
              ? "还没有最近打开的网站"
              : "记录已关闭"}
          </p>
        )}
      </div>
      {snapshot.recent.length > 0 && (
        <IconButton
          label="清空最近打开"
          onClick={() => {
            if (confirm("清空最近打开记录？"))
              void run(() => repository.clearRecent());
          }}
        >
          <Trash2 size={16} />
        </IconButton>
      )}
    </section>
  );
}
