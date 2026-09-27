import type { StorageAdapter } from "./storage";
const prefix = "personal-tab:",
  eventName = "personal-tab-change";
export function webStorage(): StorageAdapter {
  return {
    async readAll() {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (key.startsWith(prefix))
          result[key.slice(prefix.length)] = JSON.parse(
            localStorage.getItem(key)!,
          );
      }
      return result;
    },
    async write(values) {
      const entries = Object.entries(values).map(
        ([key, value]) => [prefix + key, JSON.stringify(value)] as const,
      );
      const previous = entries.map(
        ([key]) => [key, localStorage.getItem(key)] as const,
      );
      let written = 0;
      try {
        for (const [key, value] of entries) {
          localStorage.setItem(key, value);
          written++;
        }
      } catch (error) {
        const failures: unknown[] = [];
        for (const [key, value] of previous.slice(0, written).reverse()) {
          try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
          } catch (restoreError) {
            failures.push(restoreError);
          }
        }
        if (failures.length)
          throw new AggregateError(
            [error, ...failures],
            "保存失败，部分记录无法恢复，请保留当前页面",
          );
        throw error;
      }
      window.dispatchEvent(new Event(eventName));
    },
    async remove(keys) {
      keys.forEach((key) => localStorage.removeItem(prefix + key));
      window.dispatchEvent(new Event(eventName));
    },
    subscribe(listener) {
      const handler = () => listener({});
      const storageHandler = (e: StorageEvent) => {
        if (e.key === null || e.key.startsWith(prefix)) handler();
      };
      window.addEventListener(eventName, handler);
      window.addEventListener("storage", storageHandler);
      return () => {
        window.removeEventListener(eventName, handler);
        window.removeEventListener("storage", storageHandler);
      };
    },
  };
}
