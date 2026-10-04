import { Bot, ExternalLink, X } from "lucide-react";
import { IconButton } from "../../../ui/IconButton";
import type { ToolPanelProps } from "../registry";
import styles from "../tools.module.css";

export function OpenClawPanel({ onClose }: ToolPanelProps) {
  return (
    <section className={styles.panel} aria-label="OpenClaw 对话">
      <header className={styles.panelHeader}>
        <span className={styles.panelIcon}><Bot size={21} strokeWidth={1.8} /></span>
        <div className={styles.panelTitle}>
          <strong>OpenClaw</strong>
          <span>本页未接入</span>
        </div>
        {onClose && <IconButton label="关闭 OpenClaw 对话" onClick={onClose}><X size={18} /></IconButton>}
      </header>
      <div className={styles.openClawEmpty}>
        <Bot size={30} strokeWidth={1.5} />
        <strong>本页聊天还没有接入 OpenClaw</strong>
        <p>按钮会打开本机控制台，不会重复初始化或配对。</p>
        <button
          type="button"
          className={styles.primaryAction}
          onClick={() => window.open("http://127.0.0.1:18789/", "_blank", "noopener,noreferrer")}
        >
          <ExternalLink size={15} />打开 OpenClaw 控制台
        </button>
      </div>
      <form className={styles.composer} onSubmit={(event) => event.preventDefault()}>
        <input aria-label="发送给 OpenClaw 的消息" placeholder="连接后即可输入消息" disabled />
        <button type="submit" disabled aria-label="发送消息"><Bot size={17} /></button>
      </form>
    </section>
  );
}
