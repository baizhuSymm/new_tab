import type { StorageAdapter } from './storage';
const prefix = 'personal-tab:', eventName = 'personal-tab-change';
export function webStorage(): StorageAdapter {
  return {
    async readAll() { const result: Record<string, unknown> = {}; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i)!; if (key.startsWith(prefix)) result[key.slice(prefix.length)] = JSON.parse(localStorage.getItem(key)!); } return result; },
    async write(values) { for (const [key, value] of Object.entries(values)) localStorage.setItem(prefix + key, JSON.stringify(value)); window.dispatchEvent(new Event(eventName)); },
    async remove(keys) { keys.forEach(key => localStorage.removeItem(prefix + key)); window.dispatchEvent(new Event(eventName)); },
    subscribe(listener) { const handler = () => listener({}); const storageHandler = (e: StorageEvent) => { if (e.key === null || e.key.startsWith(prefix)) handler(); }; window.addEventListener(eventName, handler); window.addEventListener('storage', storageHandler); return () => { window.removeEventListener(eventName, handler); window.removeEventListener('storage', storageHandler); }; },
  };
}
