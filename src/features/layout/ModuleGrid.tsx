import type { ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import type { Layout, LayoutColumn, ModuleId } from "../../domain/types";
import { defaultLayout } from "../../domain/defaults";
import { IconButton } from "../../ui/IconButton";
import { moveModule } from "./layout";
import styles from "./layout.module.css";
const labels: Record<ModuleId, string> = {
  shortcuts: "网站管理",
  tasks: "待办事项",
  notes: "快速记录",
  recent: "浏览历史",
  schedule: "日程管理",
};
const columns: LayoutColumn[] = ["left", "right"];
export function ModuleGrid({
  layout,
  editing,
  onChange,
  children,
}: {
  layout: Layout;
  editing: boolean;
  onChange: (next: Layout) => void;
  children: Record<ModuleId, ReactNode>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function move(id: ModuleId, index: number) {
    onChange(moveModule(layout, id, index));
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const target = layout.modules.find((x) => x.id === over.id);
        const source = layout.modules.find((x) => x.id === active.id);
        if (source && target?.column === source.column)
          move(source.id, target.order);
      }}
    >
      {editing && (
        <div className={styles.hidden}>
          {layout.modules
            .filter((x) => !x.visible)
            .map((item) => (
              <button
                key={item.id}
                onClick={() =>
                  onChange({
                    ...layout,
                    modules: layout.modules.map((x) =>
                      x.id === item.id ? { ...x, visible: true } : x,
                    ),
                  })
                }
              >
                显示{labels[item.id]}
              </button>
            ))}
          <button onClick={() => onChange(structuredClone(defaultLayout))}>
            恢复默认布局
          </button>
        </div>
      )}
      <div className={styles.grid}>
        {columns.map((column) => {
          const items = layout.modules
            .filter((x) => x.column === column && x.visible)
            .sort((a, b) => a.order - b.order);
          return (
            <Column key={column} column={column} editing={editing}>
              <SortableContext
                items={items.map((x) => x.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item, index) => (
                  <Module
                    key={item.id}
                    id={item.id}
                    editing={editing}
                    controls={
                      <>
                        <button
                          type="button"
                          className="small-link"
                          aria-label={`上移${labels[item.id]}`}
                          onClick={() =>
                            move(item.id, Math.max(0, index - 1))
                          }
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="small-link"
                          aria-label={`下移${labels[item.id]}`}
                          onClick={() => move(item.id, index + 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <IconButton
                          label={`隐藏${labels[item.id]}`}
                          onClick={() =>
                            onChange({
                              ...layout,
                              modules: layout.modules.map((x) =>
                                x.id === item.id ? { ...x, visible: false } : x,
                              ),
                            })
                          }
                        >
                          <EyeOff size={15} />
                        </IconButton>
                      </>
                    }
                  >
                    {children[item.id]}
                  </Module>
                ))}
              </SortableContext>
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}
function Column({
  column,
  editing,
  children,
}: {
  column: LayoutColumn;
  editing: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-column={column}
      className={`${styles.column} ${styles[column]} ${editing ? styles.editColumn : ""}`}
    >
      {children}
    </div>
  );
}
function Module({
  id,
  editing,
  controls,
  children,
}: {
  id: ModuleId;
  editing: boolean;
  controls: ReactNode;
  children: ReactNode;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });
  return (
    <div
      ref={setNodeRef}
      data-module={id}
      className={`${styles.module} ${editing ? styles.editModule : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {editing && (
        <div className={styles.controls}>
          <button
            type="button"
            className="icon-button"
            {...attributes}
            {...listeners}
            aria-label={`拖动${labels[id]}`}
            title={`拖动${labels[id]}`}
          >
            <GripVertical size={16} />
          </button>
          <span>{labels[id]}</span>
          {controls}
        </div>
      )}
      <div
        inert={editing || undefined}
        className={editing ? styles.disabled : undefined}
      >
        {children}
      </div>
    </div>
  );
}
