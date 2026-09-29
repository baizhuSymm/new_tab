import { describe, expect, test } from "vitest";
import { sortUpcomingSchedules, toLocalDateTimeInput, fromLocalDateTimeInput } from "../src/features/schedule/scheduleDates";
import type { ScheduleEvent } from "../src/domain/types";

const event = (id: string, startAt: string, endAt: string | null = null): ScheduleEvent => ({
  id, title: id, startAt, endAt, description: null, order: 0,
  updatedAt: 1, color: "green",
});

describe("schedule date helpers", () => {
  test("sorts active appointments by start time and excludes ended entries", () => {
    const now = Date.parse("2026-10-01T12:00:00.000Z");
    expect(sortUpcomingSchedules([
      event("later", "2026-10-02T09:00:00.000Z"),
      event("ended", "2026-10-01T09:00:00.000Z", "2026-10-01T10:00:00.000Z"),
      event("ongoing", "2026-10-01T09:00:00.000Z", "2026-10-01T13:00:00.000Z"),
      event("soon", "2026-10-01T12:30:00.000Z"),
    ], now).map((item) => item.id)).toEqual(["ongoing", "soon", "later"]);
  });

  test("converts ISO instants to and from local datetime input values", () => {
    const iso = "2026-10-01T09:30:00.000Z";
    expect(fromLocalDateTimeInput(toLocalDateTimeInput(iso))?.toISOString()).toBe(iso);
    expect(toLocalDateTimeInput("not-a-date")).toBe("");
    expect(fromLocalDateTimeInput("2026-02-30T10:00")).toBeNull();
  });
});
