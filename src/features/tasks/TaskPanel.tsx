import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useAppData } from "../../app/AppProvider";
import type { Task } from "../../domain/types";
import { Dialog } from "../../ui/Dialog";
import { IconButton } from "../../ui/IconButton";
import { useClock } from "../clock/useClock";
import { classifyTask, localDate, validDueDate } from "./taskDates";
import styles from "./tasks.module.css";
export function TaskPanel() {
  const { snapshot, repository, run } = useAppData();
  const today = localDate(useClock());
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const tasks = snapshot.tasks
    .filter((t) => classifyTask(t, today) !== "completed")
    .sort(
      (a, b) =>
        (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
        (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99") ||
        a.order - b.order,
    );
  const done = snapshot.tasks
    .filter((t) => t.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const row = (task: Task) => (
    <div
      key={task.id}
      className={`${styles.row} ${task.completedAt !== null ? styles.done : ""}`}
    >
      <input
        type="checkbox"
        aria-label={`完成 ${task.title}`}
        checked={task.completedAt !== null}
        onChange={() =>
          void run(() =>
            repository.save("task", {
              ...task,
              completedAt: task.completedAt === null ? Date.now() : null,
              updatedAt: Date.now(),
            }),
          )
        }
      />
      <span
        className={`${styles.time} ${task.dueDate && task.dueDate < today && task.completedAt === null ? styles.overdue : ""}`}
      >
        {task.dueDate && task.dueDate < today && task.completedAt === null
          ? "逾期"
          : task.dueDate && task.dueDate > today
            ? task.dueDate.slice(5)
            : (task.dueTime ?? "—")}
      </span>
      <button className={styles.text} onClick={() => setEditing(task)}>
        <span>{task.title}</span>
        {task.description && <small>{task.description}</small>}
      </button>
      <IconButton label={`编辑 ${task.title}`} onClick={() => setEditing(task)}>
        <Pencil size={13} />
      </IconButton>
    </div>
  );
  return (
    <section aria-label="待办事项">
      <div className={styles.heading}>
        <h2>待办事项</h2>
        <IconButton label="添加待办" onClick={() => setEditing("new")}>
          <Plus size={19} />
        </IconButton>
      </div>
      <div className={styles.board}>
        <div className={styles.lane} role="region" aria-label="未完成事项">
          <h3>未完成 <span>{tasks.length}</span></h3>
          <div>{tasks.map(row)}</div>
          {!tasks.length && (
            <div className={styles.empty}>
              <span>暂时没有待办事项</span>
              <button className="small-link" onClick={() => setEditing("new")}>
                <Plus size={13} /> 添加一件事
              </button>
            </div>
          )}
        </div>
        <div className={styles.lane} role="region" aria-label="已完成事项">
          <h3>已完成 <span>{done.length}</span></h3>
          {done.length ? <div>{done.map(row)}</div> : <div className={styles.empty}>还没有已完成事项</div>}
        </div>
      </div>
      {editing && (
        <TaskForm
          task={editing === "new" ? undefined : editing}
          initialDate={today}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
function TaskForm({
  task,
  initialDate,
  onClose,
}: {
  task?: Task;
  initialDate: string;
  onClose: () => void;
}) {
  const { repository, run, snapshot } = useAppData();
  const [title, setTitle] = useState(task?.title ?? ""),
    [description, setDescription] = useState(task?.description ?? ""),
    [date, setDate] = useState(task?.dueDate ?? initialDate),
    [time, setTime] = useState(task?.dueTime ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog title={task ? "编辑待办" : "添加待办"} onClose={onClose}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || !validDueDate(date || null, time || null)) {
            setError("请填写标题及有效的日期、时间");
            return;
          }
          setBusy(true);
          const ok = await run(() =>
            repository.save("task", {
              id: task?.id ?? crypto.randomUUID(),
              title: title.trim(),
              description: description.trim(),
              dueDate: date || null,
              dueTime: time || null,
              completedAt: task?.completedAt ?? null,
              order: task?.order ?? snapshot.tasks.length,
              updatedAt: Date.now(),
            }),
          );
          setBusy(false);
          if (ok) onClose();
          else setError("保存失败，内容已保留");
        }}
      >
        <label>
          事项
          <input
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          备注
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            日期
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (!e.target.value) setTime("");
              }}
            />
          </label>
          <label>
            时间
            <input
              type="time"
              value={time}
              disabled={!date}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <div className="form-row">
          <button type="button" onClick={() => setDate(localDate(new Date()))}>
            移到今日
          </button>
          <button
            type="button"
            onClick={() => {
              setDate("");
              setTime("");
            }}
          >
            暂不安排日期
          </button>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          {task && (
            <button
              type="button"
              className="danger"
              onClick={async () => {
                if (
                  confirm("删除这条待办？") &&
                  (await run(() => repository.remove("task", task.id)))
                )
                  onClose();
              }}
            >
              删除
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
