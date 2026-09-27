import type { Task } from "../../domain/types";
export function localDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function classifyTask(
  task: Task,
  today: string,
): "today" | "later" | "completed" {
  return task.completedAt !== null
    ? "completed"
    : task.dueDate && task.dueDate <= today
      ? "today"
      : "later";
}
export function validDueDate(date: string | null, time: string | null) {
  if (!date) return !time;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    localDate(new Date(`${date}T12:00:00`)) !== date
  )
    return false;
  return !time || /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
