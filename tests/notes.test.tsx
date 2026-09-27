import { act, renderHook } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { useNoteDraft } from "../src/features/notes/useNoteDraft";
import { createRepository } from "../src/data/repository";
import { memoryAdapter } from "./fixtures";
test("draft waits 300ms, commits once, and does not return from an old timer", async () => {
  vi.useFakeTimers();
  try {
    const repo = createRepository(memoryAdapter());
    const initial = await repo.load();
    const write = vi.spyOn(repo, "saveDraft");
    const { result } = renderHook(() => useNoteDraft(initial.draft, repo));
    act(() => result.current.change("记住这个想法"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(write).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(write).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.submit();
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect((await repo.load()).notes).toHaveLength(1);
    expect((await repo.load()).draft.text).toBe("");
  } finally {
    vi.useRealTimers();
  }
});
test("failed write retains local input and exposes failure", async () => {
  const repo = createRepository(memoryAdapter());
  const initial = await repo.load();
  vi.spyOn(repo, "saveDraft").mockRejectedValue(Error("quota"));
  const { result } = renderHook(() => useNoteDraft(initial.draft, repo));
  act(() => result.current.change("不能丢"));
  await act(async () => {
    await result.current.flush();
  });
  expect(result.current.draft.text).toBe("不能丢");
  expect(result.current.status).toBe("保存失败");
});

test("a failed commit does not consume another tab clearing the draft", async () => {
  const repo = createRepository(memoryAdapter());
  const initial = await repo.load();
  const { result, rerender } = renderHook(
    ({ external }) => useNoteDraft(external, repo),
    { initialProps: { external: initial.draft } },
  );
  act(() => result.current.change("共同的草稿"));
  await act(async () => {
    await result.current.flush();
  });
  const saved = (await repo.load()).draft;
  rerender({ external: saved });
  vi.spyOn(repo, "commitDraft").mockRejectedValueOnce(Error("quota"));
  await act(async () => {
    await result.current.submit();
  });
  expect(result.current.status).toBe("保存失败");
  await repo.commitDraft(saved);
  rerender({ external: (await repo.load()).draft });
  expect(result.current.draft.text).toBe("");
});

test("loading a conflicting draft invalidates queued writes before they reach storage", async () => {
  const repo = createRepository(memoryAdapter());
  const initial = await repo.load();
  const original = repo.saveDraft.bind(repo);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(repo, "saveDraft").mockImplementationOnce(async (...args) => {
    await gate;
    return original(...args);
  });
  const { result, rerender } = renderHook(
    ({ external }) => useNoteDraft(external, repo),
    { initialProps: { external: initial.draft } },
  );
  act(() => result.current.change("本地 A"));
  let first!: Promise<unknown>;
  act(() => {
    first = result.current.flush();
  });
  await act(async () => {
    await Promise.resolve();
  });
  act(() => result.current.change("本地 B"));
  let second!: Promise<unknown>;
  act(() => {
    second = result.current.flush();
  });
  const remote = { id: "remote", text: "另一个标签的内容", updatedAt: 10 };
  await original(remote);
  rerender({ external: remote });
  expect(result.current.conflict).toEqual(remote);
  await act(async () => {
    const resolved = result.current.resolve(false);
    release();
    await first;
    await second;
    await resolved;
  });
  expect(result.current.draft.text).toBe(remote.text);
  expect((await repo.load()).draft).toEqual(remote);
});
