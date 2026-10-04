import { test, expect } from "vitest";
import { createRepository } from "../src/data/repository";
import { defaultLayout, defaultSettings } from "../src/domain/defaults";
import { memoryAdapter } from "./fixtures";

const legacyData = {
  schemaVersion: 2,
  settings: defaultSettings,
  layout: defaultLayout,
  draft: { id: "", text: "", updatedAt: 0 },
  "note:keep": { id: "keep", text: "留下", createdAt: 1, updatedAt: 1 },
};

test("old data loads with OpenClaw selected without overwriting other records", async () => {
  for (const schemaVersion of [1, 2]) {
    const adapter = memoryAdapter({ ...legacyData, schemaVersion });
    const snapshot = await createRepository(adapter).load();
    expect(snapshot.toolSelection).toEqual({ version: 1, ids: ["openclaw"] });
    expect(adapter.data["note:keep"]).toEqual(legacyData["note:keep"]);
    expect(adapter.data.toolSelection).toBeUndefined();
  }
});

test("concurrent additions preserve both tool IDs without duplicates", async () => {
  const adapter = memoryAdapter();
  const a = createRepository(adapter);
  const b = createRepository(adapter);
  await a.load();
  await Promise.all([
    a.setToolAdded("calculator", true),
    b.setToolAdded("translator", true),
  ]);
  await a.setToolAdded("calculator", true);
  expect((await b.load()).toolSelection.ids).toEqual([
    "openclaw",
    "calculator",
    "translator",
  ]);
  await b.setToolAdded("calculator", false);
  expect((await a.load()).toolSelection.ids).toEqual(["openclaw", "translator"]);
});

test("future tool IDs survive reads and are dropped only after an explicit edit", async () => {
  const adapter = memoryAdapter({
    ...legacyData,
    toolSelection: { version: 1, ids: ["openclaw", "future-tool"] },
  });
  const repo = createRepository(adapter);
  expect((await repo.load()).toolSelection.ids).toEqual(["openclaw", "future-tool"]);
  expect(adapter.data.toolSelection).toEqual({ version: 1, ids: ["openclaw", "future-tool"] });
  await repo.setToolAdded("calculator", true);
  expect((await repo.load()).toolSelection.ids).toEqual(["openclaw", "calculator"]);
});

test("malformed selection is rejected without changing stored data", async () => {
  const bad = { version: 1, ids: ["openclaw", "openclaw"] };
  const adapter = memoryAdapter({ ...legacyData, toolSelection: bad });
  await expect(createRepository(adapter).load()).rejects.toThrow("工具");
  expect(adapter.data.toolSelection).toEqual(bad);
});

test("failed selection write leaves the old list intact", async () => {
  const adapter = memoryAdapter();
  const repo = createRepository(adapter);
  await repo.load();
  adapter.write = async () => { throw Error("quota exceeded"); };
  await expect(repo.setToolAdded("calculator", true)).rejects.toThrow("quota");
  expect((await repo.load()).toolSelection.ids).toEqual(["openclaw"]);
});
