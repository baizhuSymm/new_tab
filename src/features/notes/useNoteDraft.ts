import { useEffect, useRef, useState } from "react";
import type { NoteDraft } from "../../domain/types";
import {
  DraftConflictError,
  sameDraft,
  type Repository,
} from "../../data/repository";
const empty = (): NoteDraft => ({ id: "", text: "", updatedAt: 0 });
export function useNoteDraft(external: NoteDraft, repository: Repository) {
  const [draft, setDraft] = useState(external),
    [status, setStatus] = useState(""),
    [conflict, setConflict] = useState<NoteDraft | null>(null),
    [busy, setBusy] = useState(false);
  const current = useRef(external),
    acknowledged = useRef(external),
    seenExternal = useRef(external);
  const dirty = useRef(false),
    blocked = useRef(false),
    submitting = useRef(false),
    mounted = useRef(true);
  const epoch = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    ownWrites = useRef(new Set<string>());
  const signature = (value: NoteDraft) => JSON.stringify(value);
  function markConflict(saved: NoteDraft) {
    clearTimeout(timer.current);
    epoch.current++;
    blocked.current = true;
    if (mounted.current) {
      setConflict(saved);
      setStatus("草稿有冲突");
    }
  }
  useEffect(() => {
    if (sameDraft(external, seenExternal.current)) return;
    seenExternal.current = external;
    if (ownWrites.current.delete(signature(external))) return;
    if (sameDraft(external, current.current)) {
      acknowledged.current = external;
      dirty.current = false;
      return;
    }
    if (dirty.current || submitting.current || blocked.current)
      markConflict(external);
    else {
      current.current = external;
      acknowledged.current = external;
      setDraft(external);
    }
  }, [external]);
  async function flush() {
    clearTimeout(timer.current);
    if (blocked.current) return false;
    if (!dirty.current) return true;
    const value = { ...current.current },
      version = epoch.current;
    if (mounted.current) setStatus("保存中");
    // A queued snapshot must re-check its generation and persisted predecessor.
    const operation = queue.current.then(async () => {
      if (version !== epoch.current || blocked.current) return false;
      ownWrites.current.delete(signature(empty()));
      ownWrites.current.add(signature(value));
      try {
        await repository.saveDraft(value, acknowledged.current);
        acknowledged.current = value;
        if (sameDraft(current.current, value)) {
          dirty.current = false;
          if (mounted.current) setStatus("已保存");
        }
        return true;
      } catch (e) {
        ownWrites.current.delete(signature(value));
        if (e instanceof DraftConflictError) {
          if (version === epoch.current) markConflict(e.saved);
        } else if (mounted.current) setStatus("保存失败");
        return false;
      }
    });
    queue.current = operation;
    return operation;
  }
  useEffect(() => {
    mounted.current = true;
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current || submitting.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      if (dirty.current && !blocked.current) void flush();
      window.removeEventListener("beforeunload", unload);
    };
  }, []);
  function change(text: string) {
    const next = {
      id: current.current.id || crypto.randomUUID(),
      text,
      updatedAt: Math.max(Date.now(), current.current.updatedAt + 1),
    };
    current.current = next;
    dirty.current = true;
    setDraft(next);
    setStatus("未保存");
    clearTimeout(timer.current);
    if (!blocked.current) timer.current = setTimeout(() => void flush(), 300);
  }
  async function submit() {
    if (submitting.current || blocked.current || !current.current.text.trim())
      return;
    submitting.current = true;
    setBusy(true);
    clearTimeout(timer.current);
    const value = { ...current.current };
    try {
      if (!(await flush())) return;
      await queue.current;
      if (blocked.current) return;
      ownWrites.current.add(signature(empty()));
      const cleared = await repository.commitDraft(value);
      if (!cleared) ownWrites.current.delete(signature(empty()));
      if (sameDraft(value, current.current)) {
        epoch.current++;
        current.current = empty();
        acknowledged.current = empty();
        dirty.current = false;
        setDraft(empty());
        setStatus("已存为便签");
      }
    } catch {
      ownWrites.current.delete(signature(empty()));
      setStatus("保存失败");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function resolve(keep: boolean) {
    if (!conflict) return;
    epoch.current++;
    clearTimeout(timer.current);
    setBusy(true);
    await queue.current;
    try {
      const saved = (await repository.load()).draft;
      acknowledged.current = saved;
      seenExternal.current = saved;
      blocked.current = false;
      setConflict(null);
      if (keep) {
        dirty.current = true;
        await flush();
      } else {
        current.current = saved;
        dirty.current = false;
        setDraft(saved);
        setStatus("已载入");
      }
    } catch {
      setStatus("保存失败");
    } finally {
      setBusy(false);
    }
  }
  return { draft, status, conflict, busy, change, flush, submit, resolve };
}
export type NoteDraftState = ReturnType<typeof useNoteDraft>;
