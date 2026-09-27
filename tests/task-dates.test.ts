import { test, expect } from "vitest";
import { classifyTask, validDueDate } from "../src/features/tasks/taskDates";
import type { Task } from "../src/domain/types";
test("groups overdue and today, future and undated, completed", () => {
  const task: Task = {
    id: "x",
    title: "t",
    description: "",
    dueDate: "2026-09-25",
    dueTime: null,
    completedAt: null,
    order: 0,
    updatedAt: 0,
  };
  expect(classifyTask(task, "2026-09-26")).toBe("today");
  expect(classifyTask({ ...task, dueDate: "2026-09-27" }, "2026-09-26")).toBe(
    "later",
  );
  expect(classifyTask({ ...task, dueDate: null }, "2026-09-26")).toBe("later");
  expect(classifyTask({ ...task, completedAt: 100 }, "2026-09-26")).toBe(
    "completed",
  );
  expect(validDueDate("2026-02-30", null)).toBe(false);
  expect(validDueDate(null, "10:00")).toBe(false);
  expect(validDueDate("2026-02-28", "24:01")).toBe(false);
  expect(validDueDate("2026-02-28", "23:01")).toBe(true);
});
