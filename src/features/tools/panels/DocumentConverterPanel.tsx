import { useState } from "react";
import { FileOutput, X } from "lucide-react";
import { IconButton } from "../../../ui/IconButton";
import type { ToolPanelProps } from "../registry";
import styles from "../tools.module.css";

export function DocumentConverterPanel({ onClose }: ToolPanelProps) {
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  return (
    <section className={styles.panel} aria-label="文档转换操作区">
      <header className={styles.panelHeader}>
        <span className={styles.panelIcon}><FileOutput size={21} /></span>
        <div className={styles.panelTitle}><strong>文档转换</strong><span>交互示例 · 功能尚未接入</span></div>
        {onClose && <IconButton label="关闭文档转换" onClick={onClose}><X size={18} /></IconButton>}
      </header>
      <div className={styles.demoBody}>
        <label>选择文档<input type="file" aria-label="选择文档" onChange={(event) => { setFileName(event.target.files?.[0]?.name ?? ""); setMessage(""); }} /></label>
        {fileName && <p className={styles.fileName}>{fileName}</p>}
        <label>目标格式<select defaultValue="pdf"><option value="pdf">PDF</option><option value="docx">Word</option><option value="txt">纯文本</option></select></label>
        <button type="button" className={styles.primaryAction} onClick={() => setMessage("转换功能尚未接入")}>转换文档</button>
        {message && <p role="status" className={styles.demoStatus}>{message}</p>}
      </div>
    </section>
  );
}
