import { useState } from "react";
import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { ScheduleEvent } from "../../domain/types";
import { Dialog } from "../../ui/Dialog";
import { IconButton } from "../../ui/IconButton";
import { fromLocalDateTimeInput, sortUpcomingSchedules, toLocalDateTimeInput } from "./scheduleDates";
import styles from "./schedule.module.css";

const colors: ScheduleEvent["color"][] = ["green", "blue", "amber", "purple", "rose"];
function nextHalfHour() {
  const date = new Date();
  date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0);
  return toLocalDateTimeInput(date.toISOString());
}
function displayDate(iso: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export function SchedulePanel() {
  const { snapshot } = useAppData();
  const [editing, setEditing] = useState<ScheduleEvent | "new" | null>(null);
  const [showAll, setShowAll] = useState(false);
  const upcoming = sortUpcomingSchedules(snapshot.schedules, Date.now()).slice(0, 4);
  return (
    <section aria-label="日程管理">
      <div className={styles.heading}>
        <h2>日程</h2>
        <span className="spacer" />
        <button className="small-link" onClick={() => setShowAll(true)}>全部日程</button>
        <IconButton label="添加日程" onClick={() => setEditing("new")}><Plus size={19} /></IconButton>
      </div>
      {upcoming.length ? (
        <div className={styles.list}>
          {upcoming.map((event) => <ScheduleRow key={event.id} event={event} onEdit={() => setEditing(event)} />)}
        </div>
      ) : (
        <div className={styles.empty}>
          <span>近期没有日程安排</span>
          <button className="small-link" onClick={() => setEditing("new")}><CalendarPlus size={14} />添加日程</button>
        </div>
      )}
      {showAll && <Dialog title="全部日程" onClose={() => setShowAll(false)}>
        <div className={styles.allList}>
          {snapshot.schedules.length ? snapshot.schedules.slice().sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).map((event) => <ScheduleRow key={event.id} event={event} onEdit={() => { setShowAll(false); setEditing(event); }} />) : <p className="empty">还没有日程</p>}
        </div>
      </Dialog>}
      {editing && <ScheduleForm event={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function ScheduleRow({ event, onEdit }: { event: ScheduleEvent; onEdit: () => void }) {
  return <div className={styles.row}>
    <span className={styles.marker} data-color={event.color} aria-label={`${event.color}标识`} />
    <button className={styles.event} onClick={onEdit}>
      <strong>{event.title}</strong>
      <time dateTime={event.startAt}>{displayDate(event.startAt)}{event.endAt ? ` - ${new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(event.endAt))}` : ""}</time>
      {event.description && <small>{event.description}</small>}
    </button>
    <IconButton label={`编辑 ${event.title}`} onClick={onEdit}><Pencil size={14} /></IconButton>
  </div>;
}

function ScheduleForm({ event, onClose }: { event?: ScheduleEvent; onClose: () => void }) {
  const { snapshot, repository, run } = useAppData();
  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(event ? toLocalDateTimeInput(event.startAt) : nextHalfHour());
  const [end, setEnd] = useState(event?.endAt ? toLocalDateTimeInput(event.endAt) : "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [color, setColor] = useState<ScheduleEvent["color"]>(event?.color ?? "green");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <Dialog title={event ? "编辑日程" : "添加日程"} onClose={onClose}>
    <form className="form" onSubmit={async (submit) => {
      submit.preventDefault();
      const startDate = fromLocalDateTimeInput(start);
      const endDate = end ? fromLocalDateTimeInput(end) : null;
      if (!title.trim() || !startDate || (end && !endDate) || (endDate && endDate <= startDate)) {
        setError("请填写标题和有效的开始时间，结束时间须晚于开始时间");
        return;
      }
      setBusy(true);
      const ok = await run(() => repository.save("schedule", {
        id: event?.id ?? crypto.randomUUID(), title: title.trim(),
        startAt: startDate.toISOString(), endAt: endDate?.toISOString() ?? null,
        description: description.trim() || null, color,
        order: event?.order ?? snapshot.schedules.length, updatedAt: Date.now(),
      }));
      setBusy(false);
      if (ok) onClose(); else setError("保存失败，内容已保留，请重试");
    }}>
      <label>标题<input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>开始时间<input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label>结束时间（选填）<input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <label>描述<textarea rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <label>颜色标识<select value={color} onChange={(e) => setColor(e.target.value as ScheduleEvent["color"])}>{colors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="form-actions">
        {event && <button type="button" className="danger" onClick={async () => { if (confirm("删除这条日程？") && await run(() => repository.remove("schedule", event.id))) onClose(); }}><Trash2 size={14} />删除</button>}
        <button type="button" onClick={onClose}>取消</button>
        <button className="primary" disabled={busy}>保存</button>
      </div>
    </form>
  </Dialog>;
}
