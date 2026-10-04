import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  X,
  Check,
  FolderPlus,
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
  const [group, setGroup] = useState("default"),
    [editing, setEditing] = useState<Shortcut | "new" | null>(null),
    [organize, setOrganize] = useState(false),
    [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const keyboardTabFocus = useRef(false);
  const editMode = organize;
  const activeGroup = snapshot.groups.some((g) => g.id === group)
    ? group
    : "default";
  const orderedGroups = snapshot.groups.slice().sort((a, b) => a.order - b.order);
  const sites = snapshot.shortcuts
    .filter((s) => s.groupId === activeGroup)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  useEffect(() => {
    if (keyboardTabFocus.current) {
      document.getElementById(`shortcut-tab-${activeGroup}`)?.focus();
      keyboardTabFocus.current = false;
    }
  }, [activeGroup, snapshot.groups]);
  function selectGroup(index: number) {
    const next = orderedGroups[index];
    if (!next) return;
    setGroup(next.id);
    keyboardTabFocus.current = true;
  }
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
      repository.reorderShortcuts(
        activeGroup,
        arrayMove(sites, from, to).map((s) => s.id),
      ),
    );
  }
  async function deleteGroup() {
    if (!confirm("删除此分组？其中的网站会移到“常用”。")) return;
    if (await run(() => repository.deleteGroup(activeGroup)))
      setGroup("default");
  }
  return (
    <section aria-label="快捷网站">
      <div className="section-heading">
        <h2>常用</h2>
        <span className="spacer" />
        {editMode && (
          <>
            <IconButton label="新增分组" onClick={() => setGroupDialog(true)}>
              <FolderPlus size={17} />
            </IconButton>
            {activeGroup !== "default" && (
              <IconButton label="删除分组" onClick={() => void deleteGroup()}>
                <X size={16} />
              </IconButton>
            )}
          </>
        )}
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
      <div className={styles.groupTabs} role="tablist" aria-label="网站分组">
        {orderedGroups.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`shortcut-tab-${item.id}`}
              aria-controls="shortcut-panel"
              aria-selected={activeGroup === item.id}
              tabIndex={activeGroup === item.id ? 0 : -1}
              className={`${styles.groupTab} ${activeGroup === item.id ? styles.activeGroupTab : ""}`}
              onClick={() => setGroup(item.id)}
              onKeyDown={(event) => {
                const last = orderedGroups.length - 1;
                const current = orderedGroups.findIndex((g) => g.id === item.id);
                if (event.key === "ArrowRight") { event.preventDefault(); selectGroup((current + 1) % orderedGroups.length); }
                if (event.key === "ArrowLeft") { event.preventDefault(); selectGroup((current + last) % orderedGroups.length); }
                if (event.key === "Home") { event.preventDefault(); selectGroup(0); }
                if (event.key === "End") { event.preventDefault(); selectGroup(last); }
              }}
            >
              {item.name}
            </button>
        ))}
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
          <div className={styles.grid} id="shortcut-panel" role="tabpanel" aria-labelledby={`shortcut-tab-${activeGroup}`}>
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
      {!sites.length && <div className="empty">这个分组还没有网站</div>}
      {editing && (
        <ShortcutForm
          site={editing === "new" ? undefined : editing}
          groupId={activeGroup}
          onClose={() => setEditing(null)}
        />
      )}
      {groupDialog && (
        <Dialog title="新增分组" onClose={() => setGroupDialog(false)}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!groupName.trim()) return;
              const id = crypto.randomUUID();
              if (
                await run(() =>
                  repository.save("group", {
                    id,
                    name: groupName.trim(),
                    order: snapshot.groups.length,
                  }),
                )
              ) {
                setGroup(id);
                setGroupName("");
                setGroupDialog(false);
              }
            }}
          >
            <label>
              分组名称
              <input
                required
                maxLength={40}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </label>
            <button className="primary">创建分组</button>
          </form>
        </Dialog>
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
          <SiteIcon name={site.icon} size={48} />
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
  groupId,
  onClose,
}: {
  site?: Shortcut;
  groupId: string;
  onClose: () => void;
}) {
  const { snapshot, repository, run } = useAppData();
  const [name, setName] = useState(site?.name ?? ""),
    [url, setUrl] = useState(site?.url ?? ""),
    [group, setGroup] = useState(site?.groupId ?? groupId),
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
              groupId: group,
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
        <label>
          分组
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            {snapshot.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
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
