import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRepository, type Repository } from "../data/repository";
import { chromeStorage, isExtension } from "../platform/chrome-storage";
import { webStorage } from "../platform/web-storage";
import type { AppSnapshot } from "../domain/types";

const repository = createRepository(
  isExtension() ? chromeStorage() : webStorage(),
);
export const AppDataContext = createContext<{
  snapshot: AppSnapshot;
  repository: Repository;
  run: (action: () => Promise<void>) => Promise<boolean>;
  error: string;
  clearError: () => void;
} | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const next = await repository.load();
      if (current === generation.current) setSnapshot(next);
    } catch (e) {
      if (current === generation.current)
        setError(String(e instanceof Error ? e.message : e));
    }
  }, []);
  useEffect(() => {
    void refresh();
    return repository.subscribe(() => {
      void refresh();
    });
  }, [refresh]);
  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      await refresh();
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
      return false;
    }
  };
  if (!snapshot)
    return (
      <main className="load-state">
        {error ? (
          <>
            <p role="alert">无法读取本地数据：{error}</p>
            <button onClick={() => void refresh()}>重试</button>
          </>
        ) : (
          "正在打开你的新标签页…"
        )}
      </main>
    );
  return (
    <AppDataContext.Provider
      value={{
        snapshot,
        repository,
        run,
        error,
        clearError: () => setError(""),
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}
export function useAppData() {
  const value = useContext(AppDataContext);
  if (!value) throw Error("AppProvider missing");
  return value;
}
