import type { StorageAdapter, StorageChanges } from './storage';
export const isExtension = () => Boolean(globalThis.chrome?.runtime?.id);
export function chromeStorage(): StorageAdapter {
  return {
    readAll: () => chrome.storage.local.get(null), write: values => chrome.storage.local.set(values), remove: keys => chrome.storage.local.remove(keys),
    subscribe: listener => { const handler = (changes: StorageChanges, area: string) => { if (area === 'local') listener(changes); }; chrome.storage.onChanged.addListener(handler); return () => chrome.storage.onChanged.removeListener(handler); },
  };
}
