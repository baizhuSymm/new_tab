import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { IconButton } from "../../../ui/IconButton";
import type { ToolPanelProps } from "../registry";
import styles from "../tools.module.css";

const keys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "C", "0", "=", "+"];

export function CalculatorPanel({ onClose }: ToolPanelProps) {
  const [expression, setExpression] = useState("");
  const [message, setMessage] = useState("");
  function press(key: string) {
    if (key === "C") {
      setExpression("");
      setMessage("");
    } else if (key === "=") {
      setMessage("计算功能尚未接入");
    } else {
      setExpression((value) => (value + key).slice(0, 80));
      setMessage("");
    }
  }
  return (
    <section className={styles.panel} aria-label="计算器操作区">
      <header className={styles.panelHeader}>
        <span className={styles.panelIcon}><Calculator size={21} /></span>
        <div className={styles.panelTitle}><strong>计算器</strong><span>交互示例 · 功能尚未接入</span></div>
        {onClose && <IconButton label="关闭计算器" onClick={onClose}><X size={18} /></IconButton>}
      </header>
      <div className={styles.demoBody}>
        <output aria-label="计算表达式" className={styles.calculatorDisplay}>{expression || "0"}</output>
        <div className={styles.calculatorKeys}>
          {keys.map((key) => <button type="button" key={key} onClick={() => press(key)}>{key}</button>)}
        </div>
        {message && <p role="status" aria-label="操作提示" className={styles.demoStatus}>{message}</p>}
      </div>
    </section>
  );
}
