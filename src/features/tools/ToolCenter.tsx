import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { ToolId } from "../../domain/tools";
import { toolDefinitions } from "./registry";
import styles from "./tools.module.css";

type Category = "all" | "common" | "text" | "file";
const categories: { id: Category; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "common", label: "常用" },
  { id: "text", label: "文本" },
  { id: "file", label: "文件" },
];

export function ToolCenter({ onBack }: { onBack: () => void }) {
  const { snapshot, repository, run } = useAppData();
  const [category, setCategory] = useState<Category>("all");
  const [selectedId, setSelectedId] = useState<ToolId>("translator");
  const [savingId, setSavingId] = useState<ToolId | null>(null);
  const [notice, setNotice] = useState("");
  const visible = toolDefinitions.filter((tool) => {
    if (category === "common") return snapshot.toolSelection.ids.includes(tool.id);
    if (category === "all") return true;
    return tool.category === category;
  });
  const selected = visible.find((tool) => tool.id === selectedId) ?? visible[0] ?? null;

  async function toggle(id: ToolId) {
    if (savingId) return;
    const added = snapshot.toolSelection.ids.includes(id);
    setSavingId(id);
    const succeeded = await run(() => repository.setToolAdded(id, !added));
    if (succeeded) setNotice(`${toolDefinitions.find((tool) => tool.id === id)?.label}${added ? "已从首页移除" : "已添加到首页"}`);
    setSavingId(null);
  }

  return (
    <section className={styles.center} aria-label="工具中心页面">
      <button type="button" className={styles.centerBack} onClick={onBack}><ArrowLeft size={16} />返回首页</button>
      <div className={styles.centerGrid}>
        <div className={styles.centerIntro}>
          <h1>工具中心</h1>
          <p>选择常用工具，添加到首页。</p>
          <nav className={styles.categories} aria-label="工具分类">
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.id}
                className={category === item.id ? styles.categoryActive : ""}
                onClick={() => setCategory(item.id)}
              >{item.label}</button>
            ))}
          </nav>
        </div>
        <div className={styles.centerList}>
          <h2>{category === "all" ? "全部工具" : categories.find((item) => item.id === category)?.label}</h2>
          {visible.length === 0 ? <p className={styles.emptyList}>此分类暂无工具</p> : (
            <div className={styles.toolRows}>
              {visible.map((tool) => {
                const Icon = tool.Icon;
                const added = snapshot.toolSelection.ids.includes(tool.id);
                return (
                  <div key={tool.id} className={`${styles.toolRow} ${selected?.id === tool.id ? styles.rowSelected : ""}`}>
                    <button type="button" className={styles.previewButton} aria-label={`预览 ${tool.label}`} aria-pressed={selected?.id === tool.id} onClick={() => setSelectedId(tool.id)}>
                      <span className={styles.rowIcon}><Icon size={25} strokeWidth={1.8} /></span>
                      <span className={styles.rowText}><strong>{tool.label}</strong><small>{tool.description}</small></span>
                    </button>
                    <button type="button" className={`${styles.toggleButton} ${added ? styles.addedButton : ""}`} aria-label={added ? `移除${tool.label}` : `添加${tool.label}到首页`} disabled={savingId !== null} onClick={() => void toggle(tool.id)}>
                      {added ? "已添加" : "添加到首页"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <p className={styles.centerNotice} aria-live="polite">{notice}</p>
        </div>
        <div className={styles.previewColumn}>
          <div className={styles.previewHeading}><h2>工具预览</h2><span>交互示例</span></div>
          {selected ? <selected.Panel /> : <p className={styles.previewEmpty}>选择工具查看交互示例</p>}
        </div>
      </div>
    </section>
  );
}
