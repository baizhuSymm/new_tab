import { useState } from "react";
import { Bot, ExternalLink, X } from "lucide-react";
import { IconButton } from "../../ui/IconButton";
import styles from "./ai-tools.module.css";

export function AiTools() {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.section} aria-label="AI 工具入口">
      <div className={styles.tools}>
        <button
          type="button"
          className={`${styles.tool} ${open ? styles.selected : ""}`}
          aria-expanded={open}
          aria-controls="openclaw-chat"
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.icon}>
            <Bot size={22} strokeWidth={1.8} />
          </span>
          <span>OpenClaw</span>
        </button>
      </div>
      {open && (
        <section className={styles.chat} id="openclaw-chat" aria-label="OpenClaw 对话">
          <header className={styles.chatHeader}>
            <span className={styles.chatIcon}>
              <Bot size={21} strokeWidth={1.8} />
            </span>
            <div className={styles.chatTitle}>
              <strong>OpenClaw</strong>
              <span><i /> 本页未接入</span>
            </div>
            <IconButton label="关闭 OpenClaw 对话" onClick={() => setOpen(false)}>
              <X size={18} />
            </IconButton>
          </header>
          <div className={styles.empty}>
            <Bot size={30} strokeWidth={1.5} />
            <strong>本页聊天还没有接入 OpenClaw</strong>
            <p>按钮会打开本机控制台，不会重复初始化或配对。</p>
            <button
              type="button"
              className={styles.connect}
              onClick={() =>
                window.open(
                  "http://127.0.0.1:18789/",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <ExternalLink size={15} />
              打开 OpenClaw 控制台
            </button>
          </div>
          <form className={styles.composer} onSubmit={(event) => event.preventDefault()}>
            <input
              aria-label="发送给 OpenClaw 的消息"
              placeholder="连接后即可输入消息"
              disabled
            />
            <button type="submit" disabled aria-label="发送消息">
              <Bot size={17} />
            </button>
          </form>
        </section>
      )}
    </section>
  );
}
