import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, History } from "lucide-react";
import {
  getRecentBrowserHistory,
  hasBrowserHistoryAccess,
  isBrowserHistoryAvailable,
  openNativeHistory,
  requestBrowserHistoryAccess,
  type BrowserHistoryEntry,
} from "../../platform/browser-history";
import styles from "./history.module.css";

type Status = "web" | "checking" | "permission" | "loading" | "ready" | "error";

function visitTime(time: number) {
  if (!time) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} 天前`;
  return new Date(time).toLocaleDateString("zh-CN");
}

export function BrowserHistory({ onOpen }: { onOpen: (url: string) => void }) {
  const available = isBrowserHistoryAvailable();
  const [status, setStatus] = useState<Status>(available ? "checking" : "web");
  const [entries, setEntries] = useState<BrowserHistoryEntry[]>([]);

  const load = useCallback(async () => {
    try {
      setStatus("loading");
      setEntries(await getRecentBrowserHistory());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (!(await hasBrowserHistoryAccess())) {
        setEntries([]);
        setStatus("permission");
        return;
      }
      await load();
    } catch {
      setStatus("error");
    }
  }, [load]);

  useEffect(() => {
    if (!available) return;
    void refresh();
    const onChange = () => { void refresh(); };
    const permissionsApi = chrome.permissions;
    permissionsApi.onAdded?.addListener(onChange);
    permissionsApi.onRemoved?.addListener(onChange);
    return () => {
      permissionsApi.onAdded?.removeListener(onChange);
      permissionsApi.onRemoved?.removeListener(onChange);
    };
  }, [available, refresh]);

  useEffect(() => {
    if (status !== "ready") return;
    const historyApi = chrome.history;
    const onChange = () => { void refresh(); };
    historyApi?.onVisited?.addListener(onChange);
    historyApi?.onVisitRemoved?.addListener(onChange);
    return () => {
      historyApi?.onVisited?.removeListener(onChange);
      historyApi?.onVisitRemoved?.removeListener(onChange);
    };
  }, [status, refresh]);

  function enable() {
    // Chrome requires permission requests to start directly in the click handler.
    void requestBrowserHistoryAccess()
      .then((granted) => { if (granted) void load(); })
      .catch(() => setStatus("permission"));
  }

  return (
    <section className={styles.section} aria-label="浏览历史">
      <div className={styles.header}>
        <h2>浏览历史</h2>
        {available && (
          <button className={styles.all} type="button" onClick={() => void openNativeHistory()}>
            查看全部 <ArrowUpRight size={14} />
          </button>
        )}
      </div>
      {status === "web" && <p className={styles.message}>浏览历史仅在浏览器扩展中显示</p>}
      {status === "checking" && <p className={styles.message}>正在检查访问权限…</p>}
      {status === "permission" && (
        <div className={styles.prompt}>
          <p>启用后可在首页查看最近访问的网页。浏览器会询问是否允许读取浏览历史。</p>
          <button type="button" onClick={enable}>启用浏览历史</button>
        </div>
      )}
      {status === "loading" && <p className={styles.message}>正在读取浏览历史…</p>}
      {status === "error" && (
        <div className={styles.prompt}>
          <p>浏览历史暂时无法读取。</p>
          <button type="button" onClick={() => void refresh()}>重试</button>
        </div>
      )}
      {status === "ready" && (
        <div className={styles.items}>
          {entries.map((entry) => (
            <button className={styles.item} type="button" key={entry.url} title={entry.url} onClick={() => onOpen(entry.url)}>
              <History size={18} aria-hidden="true" />
              <span className={styles.details}>
                <strong>{entry.title}</strong>
                <small>{new URL(entry.url).hostname} · {visitTime(entry.visitedAt)}</small>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ))}
          {entries.length === 0 && <p className={styles.message}>暂无浏览历史</p>}
        </div>
      )}
    </section>
  );
}
