import { test, expect } from "vitest";
import { moveModule } from "../src/features/layout/layout";
import { defaultLayout } from "../src/domain/defaults";
import { validateLayout } from "../src/data/validate";

test("default layout fixes recent sites left and schedule, tasks and notes right", () => {
  expect(defaultLayout.version).toBe(2);
  expect(defaultLayout.modules.map(({ id, column }) => [id, column])).toEqual([
    ["shortcuts", "left"], ["recent", "left"],
    ["schedule", "right"], ["tasks", "right"], ["notes", "right"],
  ]);
});

test("rejects a persisted module assigned to the opposite fixed column", () => {
  const crossed = structuredClone(defaultLayout);
  crossed.modules.find((item) => item.id === "recent")!.column = "right";
  expect(() => validateLayout(crossed)).toThrow("布局数据格式不正确");
});

test("reorders a module only within its assigned column without mutation", () => {
  const before = structuredClone(defaultLayout);
  const next = moveModule(defaultLayout, "notes", 0);
  expect(defaultLayout).toEqual(before);
  expect(new Set(next.modules.map((item) => item.id)).size).toBe(5);
  expect(next.modules.find((item) => item.id === "notes")).toMatchObject({ column: "right", order: 0 });
  expect(next.modules.filter((item) => item.column === "left").map((item) => item.id)).toEqual(["shortcuts", "recent"]);
});
