import { useState } from "react";
import {
  Plus,
  Pencil,
  X,
  Check,
} from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppData } from "../../app/AppProvider";
import type { Shortcut } from "../../domain/types";
import { normalizeWebUrl } from "../../domain/urls";
import { Dialog } from "../../ui/Dialog";
import { IconButton } from "../../ui/IconButton";
import { SiteIcon } from "./SiteIcon";
import styles from "./shortcuts.module.css";

export function ShortcutGrid({ onOpen }: { onOpen: (site: Shortcut) => void }) {
  const { snapshot, repository, run } = useAppData();
  const [editing, setEditing] = useState<Shortcut | "new" | null>(null),
    [organize, setOrganize] = useState(false);
  const editMode = organize;
  const sites = snapshot.shortcuts.slice()
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter", "Tab"],
      },
    }),
  );
  async function reorder(from: number, to: number) {
    if (to < 0 || to >= sites.length) return;
    await run(() =>
      repository.reorderAllShortcuts(arrayMove(sites, from, to).map((s) => s.id)),
    );
  }
  return (
    <section aria-label="快捷网站">
      <div className="section-heading">
        <h2>网站管理</h2>
        <span className="spacer" />
        <IconButton
          label={organize ? "完成网站整理" : "整理网站"}
          onClick={() => setOrganize(!organize)}
        >
          {organize ? <Check size={16} /> : <Pencil size={16} />}
        </IconButton>
        <IconButton label="添加网站" onClick={() => setEditing("new")}>
          <Plus size={20} />
        </IconButton>
      </div>
      <DndContext
        sensors={sensors}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "按空格开始排序，方向键移动，再按空格完成，Escape 取消。未排序时按 Enter 打开网站。",
          },
        }}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id)
            void reorder(
              sites.findIndex((x) => x.id === active.id),
              sites.findIndex((x) => x.id === over.id),
            );
        }}
      >
        <SortableContext
          items={sites.map((s) => s.id)}
          strategy={rectSortingStrategy}
        >
          <div className={styles.sites}>
            {sites.map((site) => (
              <SiteTile
                key={site.id}
                site={site}
                editMode={editMode}
                onOpen={() => onOpen(site)}
                onEdit={() => setEditing(site)}
                onDelete={() => {
                  if (confirm(`删除“${site.name}”？`))
                    void run(() => repository.remove("shortcut", site.id));
                }}
              />
            ))}
            <button
              type="button"
              className={`${styles.site} ${styles.addSite}`}
              aria-label="在网站列表末尾添加网站"
              onClick={() => setEditing("new")}
            >
              <span className={styles.logo}><Plus size={24} strokeWidth={1.8} /></span>
              <span className={styles.name}>添加</span>
            </button>
          </div>
        </SortableContext>
      </DndContext>
      {!sites.length && <div className="empty">还没有网站</div>}
      {editing && (
        <ShortcutForm
          site={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
function SiteTile({
  site,
  editMode,
  onOpen,
  onEdit,
  onDelete,
}: {
  site: Shortcut;
  editMode: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging,
  } = useSortable({ id: site.id });
  return (
    <div
      ref={setNodeRef}
      data-site-id={site.id}
      className={`${styles.tile} ${isDragging ? styles.dragging : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={styles.site}
        onClick={() => {
          if (!isDragging && !editMode) onOpen();
        }}
        title={site.url}
      >
        <span className={styles.logo}>
          <SiteIcon name={site.icon} size={40} />
        </span>
        <span className={styles.name}>{site.name}</span>
      </button>
      {editMode && (
        <>
          <IconButton
            className={styles.editSite}
            label={`编辑 ${site.name}`}
            onClick={onEdit}
          >
            <Pencil size={14} />
          </IconButton>
          <IconButton
            className={styles.deleteSite}
            label={`删除 ${site.name}`}
            onClick={onDelete}
          >
            <X size={14} />
          </IconButton>
        </>
      )}
    </div>
  );
}
function ShortcutForm({
  site,
  onClose,
}: {
  site?: Shortcut;
  onClose: () => void;
}) {
  const { snapshot, repository, run } = useAppData();
  const [name, setName] = useState(site?.name ?? ""),
    [url, setUrl] = useState(site?.url ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog title={site ? "编辑网站" : "添加网站"} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          const href = normalizeWebUrl(url);
          if (!href || !name.trim()) {
            setError("请输入名称和有效的 HTTP / HTTPS 网址");
            return;
          }
          setBusy(true);
          const ok = await run(() =>
            repository.save("shortcut", {
              id: site?.id ?? crypto.randomUUID(),
              name: name.trim(),
              url: href,
              icon: site?.url === href ? site.icon : "",
              groupId: site?.groupId ?? "default",
              order: site?.order ?? snapshot.shortcuts.length,
              updatedAt: Date.now(),
            }),
          );
          setBusy(false);
          if (ok) onClose();
          else setError("保存失败，内容已保留，请重试");
        }}
      >
        <label>
          网站名称
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          网址
          <input
            required
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {site && (
            <button
              type="button"
              className="danger"
              onClick={async () => {
                if (
                  confirm(`删除“${site.name}”？`) &&
                  (await run(() => repository.remove("shortcut", site.id)))
                )
                  onClose();
              }}
            >
              删除网站
            </button>
          )}
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            保存
          </button>
        </div>
      </form>
    </Dialog>
  );
}
