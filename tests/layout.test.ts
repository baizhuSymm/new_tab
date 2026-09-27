import { test, expect } from "vitest";
import { moveModule } from "../src/features/layout/layout";
import { defaultLayout } from "../src/domain/defaults";
test("moves a module without mutation, lost or duplicate ids", () => {
  const before = structuredClone(defaultLayout);
  const next = moveModule(defaultLayout, "tasks", "full", 0);
  expect(defaultLayout).toEqual(before);
  expect(new Set(next.modules.map((x) => x.id)).size).toBe(4);
  expect(next.modules.find((x) => x.id === "tasks")).toMatchObject({
    column: "full",
    order: 0,
  });
  expect(next.modules.find((x) => x.id === "recent")?.order).toBe(1);
});
