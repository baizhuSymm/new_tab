import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { ToolSelection } from "../../domain/types";
import { isToolId, type ToolId } from "../../domain/tools";
import { getToolDefinition } from "./registry";
import styles from "./tools.module.css";

export function ToolBar({ selection, onAdd }: { selection: ToolSelection; onAdd: () => void }) {
  const [activeId, setActiveId] = useState<ToolId | null>(null);
  const ids = selection.ids.filter(isToolId);
  useEffect(() => {
    if (activeId && !ids.includes(activeId)) setActiveId(null);
  }, [activeId, ids]);
  const active = activeId && ids.includes(activeId) ? getToolDefinition(activeId) : null;

  return (
    <section className={styles.barSection} aria-label="首页工具栏">
      <div className={styles.barRow}>
        <div className={styles.barScroller}>
          {ids.map((id) => {
            const tool = getToolDefinition(id);
            const Icon = tool.Icon;
            return (
              <button
                key={id}
                type="button"
                className={`${styles.toolTile} ${active?.id === id ? styles.toolTileActive : ""}`}
                aria-expanded={active?.id === id}
                aria-controls={`tool-panel-${id}`}
                onClick={() => setActiveId((current) => current === id ? null : id)}
              >
                <Icon size={22} strokeWidth={1.8} />
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className={`${styles.toolTile} ${styles.addTile}`} aria-label="添加工具" onClick={onAdd}>
          <Plus size={22} strokeWidth={1.8} />
          <span>添加</span>
        </button>
      </div>
      {active && (
        <div className={styles.barPanel} id={`tool-panel-${active.id}`}>
          <active.Panel onClose={() => setActiveId(null)} />
        </div>
      )}
    </section>
  );
}
