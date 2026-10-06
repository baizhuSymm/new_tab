import { useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { ScheduleEvent } from "../../domain/types";
import { Dialog } from "../../ui/Dialog";
import { IconButton } from "../../ui/IconButton";
import { useClock } from "../clock/useClock";
import { fromLocalDateTimeInput, schedulesForDate, toLocalDateTimeInput } from "./scheduleDates";
import styles from "./schedule.module.css";

const colors: ScheduleEvent["color"][] = ["green", "blue", "amber", "purple", "rose"];
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
function localDate(date: Date) {
  return toLocalDateTimeInput(date.toISOString()).slice(0, 10);
}
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
  const today = localDate(useClock());
  const [selectedDate, setSelectedDate] = useState(today);
  const [editing, setEditing] = useState<ScheduleEvent | "new" | null>(null);
  const [showAll, setShowAll] = useState(false);
  const selected = new Date(`${selectedDate}T12:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayEvents = schedulesForDate(snapshot.schedules, selectedDate);
  function changeMonth(offset: number) {
    const first = new Date(year, month + offset, 1);
    const day = Math.min(selected.getDate(), new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate());
    setSelectedDate(localDate(new Date(first.getFullYear(), first.getMonth(), day)));
  }
  return (
    <section aria-label="日程管理">
      <div className={styles.heading}>
        <h2 aria-label="日程管理"><button className={styles.headingButton} aria-label="查看全部日程" onClick={() => setShowAll(true)}>日程管理</button></h2>
        <IconButton label="添加日程" onClick={() => setEditing("new")}><Plus size={19} /></IconButton>
      </div>
      <div className={styles.board}>
        <div className={styles.agenda} role="region" aria-label="所选日期日程">
          {dayEvents.length ? (
            <div className={styles.list}>
              {dayEvents.map((event) => <ScheduleRow key={event.id} event={event} onEdit={() => setEditing(event)} />)}
            </div>
          ) : (
            <div className={styles.empty}>
              <span>这一天没有日程</span>
              <button className="small-link" onClick={() => setEditing("new")}><CalendarPlus size={14} />添加日程</button>
            </div>
          )}
        </div>
        <div className={styles.calendar} role="region" aria-label="日历">
          <div className={styles.calendarHeading}>
            <strong>{year}年{month + 1}月</strong>
            <span className={styles.calendarControls}>
              <IconButton label="回到今天" onClick={() => setSelectedDate(today)}>今</IconButton>
              <IconButton label="上个月" onClick={() => changeMonth(-1)}><ChevronLeft size={16} /></IconButton>
              <IconButton label="下个月" onClick={() => changeMonth(1)}><ChevronRight size={16} /></IconButton>
            </span>
          </div>
          <div className={styles.calendarGrid}>
            {weekdays.map((day) => <span key={day} className={styles.weekday}>{day}</span>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = localDate(new Date(year, month, index + 1));
              const hasEvents = schedulesForDate(snapshot.schedules, date).length > 0;
              return <button
                key={date}
                type="button"
                className={styles.day}
                data-selected={date === selectedDate || undefined}
                data-today={date === today || undefined}
                aria-label={`选择 ${date}`}
                aria-pressed={date === selectedDate}
                onClick={() => setSelectedDate(date)}
              >
                {index + 1}
                {hasEvents && <span className={styles.dayDot} />}
              </button>;
            })}
          </div>
        </div>
      </div>
      {showAll && <Dialog title="全部日程" onClose={() => setShowAll(false)}>
        <div className={styles.allList}>
          {snapshot.schedules.length ? snapshot.schedules.slice().sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).map((event) => <ScheduleRow key={event.id} event={event} onEdit={() => { setShowAll(false); setEditing(event); }} />) : <p className="empty">还没有日程</p>}
        </div>
      </Dialog>}
      {editing && <ScheduleForm event={editing === "new" ? undefined : editing} initialDate={selectedDate} onClose={() => setEditing(null)} />}
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

function ScheduleForm({ event, initialDate, onClose }: { event?: ScheduleEvent; initialDate: string; onClose: () => void }) {
  const { snapshot, repository, run } = useAppData();
  const [title, setTitle] = useState(event?.title ?? "");
  const [start, setStart] = useState(event ? toLocalDateTimeInput(event.startAt) : initialDate === localDate(new Date()) ? nextHalfHour() : `${initialDate}T09:00`);
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
