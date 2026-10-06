import type { ScheduleEvent } from "../../domain/types";

export function sortUpcomingSchedules(events: ScheduleEvent[], now: number) {
  return events
    .filter((event) => Date.parse(event.endAt ?? event.startAt) >= now)
    .slice()
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

export function schedulesForDate(events: ScheduleEvent[], date: string) {
  const dayStart = new Date(`${date}T00:00:00`);
  if (!Number.isFinite(dayStart.getTime())) return [];
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);
  return events
    .filter((event) => {
      const start = Date.parse(event.startAt);
      const end = event.endAt ? Date.parse(event.endAt) : start;
      return start < nextDay.getTime() && (event.endAt ? end > dayStart.getTime() : start >= dayStart.getTime());
    })
    .slice()
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.order - b.order);
}

export function toLocalDateTimeInput(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalDateTimeInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return Number.isFinite(date.getTime()) && local === value ? date : null;
}
