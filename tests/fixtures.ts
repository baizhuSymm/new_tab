import type { StorageAdapter } from "../src/platform/storage";
export function memoryAdapter(
  initial: Record<string, unknown> = {},
): StorageAdapter & { data: Record<string, unknown> } {
  const data = structuredClone(initial);
  const listeners = new Set<() => void>();
  return {
    data,
    readAll: async () => structuredClone(data),
    write: async (values) => {
      Object.assign(data, structuredClone(values));
      listeners.forEach((f) => f());
    },
    remove: async (keys) => {
      keys.forEach((k) => delete data[k]);
      listeners.forEach((f) => f());
    },
    subscribe: (listener) => {
      const notify = () => listener({});
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
  };
}
