export type StorageChanges = Record<
  string,
  { oldValue?: unknown; newValue?: unknown }
>;
export interface StorageAdapter {
  readAll(): Promise<Record<string, unknown>>;
  write(values: Record<string, unknown>): Promise<void>;
  remove(keys: string[]): Promise<void>;
  subscribe(listener: (changes: StorageChanges) => void): () => void;
}
