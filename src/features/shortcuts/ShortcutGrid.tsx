import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  Globe,
  FolderPlus,
  ChevronDown,
} from "lucide-react";
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

export function ShortcutGrid({
  onOpen,
  management = false,
}: {
  onOpen: (site: Shortcut) => void;
  management?: boolean;
}) {
  const { snapshot, repository, run } = useAppData();
  const [group, setGroup] = useState("default"),
    [editing, setEditing] = useState<Shortcut | "new" | null>(null),
    [organize, setOrganize] = useState(false),
    [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const editMode = management || organize;
  const activeGroup = snapshot.groups.some((g) => g.id === group)
    ? group
    : "default";
  const sites = snapshot.shortcuts
    .filter((s) => s.groupId === activeGroup)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
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
        <h2>{management ? "我的网站" : "常用"}</h2>
        {snapshot.groups.length > 1 && (
          <select
            className={styles.groupSelect}
            aria-label="网站分组"
            value={activeGroup}
            onChange={(e) => setGroup(e.target.value)}
          >
            {snapshot.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        {snapshot.groups.length === 1 && (
          <ChevronDown size={15} className="muted" />
        )}
        <span className="spacer" />
        {editMode && (
          <>
            <IconButton label="新增分组" onClick={() => setGroupDialog(true)}>
              <FolderPlus size={17} />
            </IconButton>
            {activeGroup !== "default" && (
              <IconButton label="删除分组" onClick={() => void deleteGroup()}>
                <Trash2 size={16} />
              </IconButton>
            )}
          </>
        )}
        {!management && (
          <IconButton
            label={organize ? "完成网站整理" : "整理网站"}
            onClick={() => setOrganize(!organize)}
          >
            <Pencil size={16} />
          </IconButton>
        )}
        <IconButton label="添加网站" onClick={() => setEditing("new")}>
          <Plus size={20} />
        </IconButton>
      </div>
      <DndContext
        sensors={sensors}
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
          <div className={styles.grid}>
            {sites.map((site, index) => (
              <SiteTile
                key={site.id}
                site={site}
                editMode={editMode}
                onOpen={() => onOpen(site)}
                onEdit={() => setEditing(site)}
                onMove={(delta) => void reorder(index, index + delta)}
              />
            ))}
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
  onMove,
}: {
  site: Shortcut;
  editMode: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onMove: (delta: number) => void;
}) {
  const {
    setNodeRef,
    transform,
    transition,
    attributes,
    listeners,
    isDragging,
  } = useSortable({ id: site.id, disabled: !editMode });
  return (
    <div
      ref={setNodeRef}
      className={`${styles.tile} ${isDragging ? styles.dragging : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        className={styles.site}
        onClick={editMode ? onEdit : onOpen}
        title={site.url}
      >
        <span className={styles.logo}>
          <SiteIcon name={site.icon} size={40} />
        </span>
        <span className={styles.name}>{site.name}</span>
        <small>{categories[site.icon] ?? new URL(site.url).hostname}</small>
      </button>
      {editMode && (
        <div className={styles.tileTools}>
          <button
            type="button"
            className="icon-button"
            {...attributes}
            {...listeners}
            aria-label={`拖动 ${site.name}`}
            title="拖动排序"
          >
            <GripVertical size={14} />
          </button>
          <IconButton label={`前移 ${site.name}`} onClick={() => onMove(-1)}>
            <ArrowLeft size={13} />
          </IconButton>
          <IconButton label={`后移 ${site.name}`} onClick={() => onMove(1)}>
            <ArrowRight size={13} />
          </IconButton>
        </div>
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
const categories: Record<string, string> = {
  google: "搜索",
  youtube: "视频",
  github: "代码",
  notion: "笔记",
  openai: "对话",
  zhihu: "问答",
  wechat: "社交",
  xiaohongshu: "生活",
  bilibili: "视频",
  neteasecloudmusic: "音乐",
  tencentqq: "文档",
  lark: "协作",
  gmail: "邮件",
  googlecalendar: "日程",
  baidu: "搜索",
  taobao: "购物",
  jd: "购物",
  douban: "兴趣",
};
