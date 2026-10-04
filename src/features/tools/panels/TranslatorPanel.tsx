import { useState } from "react";
import { Languages, X } from "lucide-react";
import { IconButton } from "../../../ui/IconButton";
import type { ToolPanelProps } from "../registry";
import styles from "../tools.module.css";

export function TranslatorPanel({ onClose }: ToolPanelProps) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className={styles.panel} aria-label="翻译操作区">
      <header className={styles.panelHeader}>
        <span className={styles.panelIcon}><Languages size={21} /></span>
        <div className={styles.panelTitle}><strong>翻译</strong><span>交互示例 · 服务尚未接入</span></div>
        {onClose && <IconButton label="关闭翻译" onClick={onClose}><X size={18} /></IconButton>}
      </header>
      <div className={styles.demoBody}>
        <div className={styles.languageRow}>
          <label>原文语言<select defaultValue="zh"><option value="zh">中文（简体）</option><option value="en">英语</option><option value="ja">日语</option></select></label>
          <label>目标语言<select defaultValue="en"><option value="en">英语</option><option value="zh">中文（简体）</option><option value="ja">日语</option></select></label>
        </div>
        <label>待翻译文本<textarea aria-label="待翻译文本" value={text} onChange={(event) => { setText(event.target.value); setMessage(""); }} placeholder="输入要翻译的文字…" rows={4} maxLength={500} /></label>
        <button type="button" className={styles.primaryAction} onClick={() => setMessage("翻译服务尚未接入")}>翻译</button>
        {message && <p role="status" className={styles.demoStatus}>{message}</p>}
      </div>
    </section>
  );
}
