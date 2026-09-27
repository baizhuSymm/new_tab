import { test, expect } from "vitest";
import { createRepository } from "../src/data/repository";
import { memoryAdapter } from "./fixtures";

test("failed read does not overwrite existing data", async () => {
  const adapter = memoryAdapter({ schemaVersion: 1 });
  adapter.readAll = async () => {
    throw Error("read failed");
  };
  await expect(createRepository(adapter).load()).rejects.toThrow("read failed");
  expect(adapter.data).toEqual({ schemaVersion: 1 });
});
test("independent clients preserve distinct tasks", async () => {
  const adapter = memoryAdapter();
  const a = createRepository(adapter),
    b = createRepository(adapter);
  await a.load();
  const task = {
    title: "任务",
    description: "",
    dueDate: null,
    dueTime: null,
    completedAt: null,
    order: 0,
    updatedAt: 1,
  };
  await Promise.all([
    a.save("task", { ...task, id: "a" }),
    b.save("task", { ...task, id: "b" }),
  ]);
  expect((await a.load()).tasks.map((t) => t.id).sort()).toEqual(["a", "b"]);
});
test("deleted seed sites do not reappear on initialization", async () => {
  const repo = createRepository(memoryAdapter());
  for (const site of (await repo.load()).shortcuts)
    await repo.remove("shortcut", site.id);
  expect((await repo.load()).shortcuts).toEqual([]);
});
test("quota error leaves old record intact", async () => {
  const adapter = memoryAdapter();
  const repo = createRepository(adapter);
  await repo.load();
  adapter.write = async () => {
    throw Error("quota exceeded");
  };
  await expect(repo.saveSettings({ searchEngine: "google" })).rejects.toThrow(
    "quota",
  );
  expect((await repo.load()).settings.searchEngine).toBe("bing");
});
test("committing an old draft preserves a newer draft and is idempotent", async () => {
  const repo = createRepository(memoryAdapter());
  await repo.load();
  const old = { id: "n1", text: "旧记录", updatedAt: 1 };
  const newer = { id: "n2", text: "新草稿", updatedAt: 2 };
  await repo.saveDraft(newer);
  await repo.commitDraft(old);
  await repo.commitDraft(old);
  const state = await repo.load();
  expect(state.notes).toHaveLength(1);
  expect(state.draft).toEqual(newer);
});
test("recent sites are deduplicated and capped at 20", async () => {
  const repo = createRepository(memoryAdapter());
  await repo.load();
  for (let i = 0; i < 22; i++)
    await repo.recordRecent({
      id: `r${i}`,
      url: `https://site${i}.com/`,
      name: `site${i}`,
      icon: "",
      openedAt: i,
    });
  await repo.recordRecent({
    id: "other",
    url: "https://site21.com/",
    name: "latest",
    icon: "",
    openedAt: 100,
  });
  expect((await repo.load()).recent).toHaveLength(20);
  await repo.saveSettings({ recordRecent: false });
  await repo.recordRecent({
    id: "off",
    url: "https://off.com",
    name: "off",
    icon: "",
    openedAt: 200,
  });
  expect((await repo.load()).recent.some((r) => r.id === "off")).toBe(false);
});

test("invalid records and settings are rejected without corrupting saved data", async () => {
  const adapter = memoryAdapter();
  const repo = createRepository(adapter);
  await repo.load();
  await expect(
    repo.save("shortcut", {
      id: "bad",
      name: "bad",
      url: "javascript:alert(1)",
      icon: "",
      groupId: "default",
      order: 0,
      updatedAt: 1,
    }),
  ).rejects.toThrow();
  await expect(repo.saveSettings({ positionX: NaN })).rejects.toThrow();
  expect((await repo.load()).settings.positionX).toBe(50);
  adapter.data["task:broken"] = {
    id: "broken",
    title: "broken",
    description: "",
    dueDate: null,
    dueTime: null,
    completedAt: null,
  };
  await expect(repo.load()).rejects.toThrow();
  expect(adapter.data["task:broken"]).toBeDefined();
});

test("stale draft writes fail with the latest draft instead of overwriting it", async () => {
  const repo = createRepository(memoryAdapter());
  const initial = await repo.load();
  const remote = { id: "remote", text: "其他标签的内容", updatedAt: 2 };
  await repo.saveDraft(remote);
  await expect(
    repo.saveDraft(
      { id: "local", text: "旧内容", updatedAt: 1 },
      initial.draft,
    ),
  ).rejects.toThrow("草稿已更新");
  expect((await repo.load()).draft).toEqual(remote);
});

test("group deletion moves latest members and stale saves cannot create orphan sites", async () => {
  const repo = createRepository(memoryAdapter());
  await repo.load();
  await repo.save("group", { id: "work", name: "工作", order: 1 });
  const site = {
    id: "one",
    name: "项目",
    url: "https://example.com/",
    icon: "",
    groupId: "work",
    order: 0,
    updatedAt: 1,
  };
  await repo.save("shortcut", site);
  await repo.deleteGroup("work");
  expect(
    (await repo.load()).shortcuts.find((s) => s.id === "one")?.groupId,
  ).toBe("default");
  await expect(repo.save("shortcut", { ...site, id: "stale" })).rejects.toThrow(
    "分组已删除",
  );
});

test("reordering only changes live order fields and never resurrects a deletion", async () => {
  const repo = createRepository(memoryAdapter());
  const initial = await repo.load();
  const [a, b] = initial.shortcuts;
  await repo.remove("shortcut", a.id);
  await repo.save("shortcut", { ...b, name: "新名称" });
  await repo.reorderShortcuts("default", [a.id, b.id]);
  const state = await repo.load();
  expect(state.shortcuts.some((s) => s.id === a.id)).toBe(false);
  expect(state.shortcuts.find((s) => s.id === b.id)?.name).toBe("新名称");
});

test("wallpaper and settings commit together and survive an injected failure", async () => {
  const adapter = memoryAdapter();
  const repo = createRepository(adapter);
  await repo.load();
  const asset = {
    id: "wall",
    dataUrl: "data:image/webp;base64,YQ==",
    mimeType: "image/webp",
    byteLength: 1,
    positionX: 50,
    positionY: 50,
  };
  await repo.applyWallpaper(asset, {
    wallpaper: "custom",
    positionX: 30,
    positionY: 40,
  });
  adapter.write = async () => {
    throw Error("quota");
  };
  await expect(
    repo.applyWallpaper({ ...asset, id: "other" }, { positionX: 90 }),
  ).rejects.toThrow("quota");
  const state = await repo.load();
  expect(state.wallpaper?.id).toBe("wall");
  expect(state.settings.positionX).toBe(30);
});
