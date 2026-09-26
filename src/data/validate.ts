import type { AppSnapshot, EntityMap } from '../domain/types';
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
export function validateEntity<K extends keyof EntityMap>(kind: K, value: unknown): asserts value is EntityMap[K] {
  if (!record(value) || typeof value.id !== 'string' || !value.id) throw Error('本地记录格式不正确');
  const strings: Record<keyof EntityMap, string[]> = { shortcut: ['name', 'url', 'icon', 'groupId'], group: ['name'], task: ['title', 'description'], note: ['text'], recent: ['name', 'url', 'icon'] };
  if (strings[kind].some(field => typeof value[field] !== 'string')) throw Error('本地记录字段不完整');
  if (kind === 'task' && [value.dueDate, value.dueTime].some(v => v !== null && typeof v !== 'string')) throw Error('待办日期格式不正确');
}
export function validateSnapshot(snapshot: AppSnapshot) {
  const s = snapshot.settings;
  if (!s || !['bing', 'baidu', 'google'].includes(s.searchEngine) || !['current', 'new'].includes(s.openTarget) || !['12', '24'].includes(s.hourFormat) || typeof s.recordRecent !== 'boolean') throw Error('设置数据格式不正确');
  if (!snapshot.layout || snapshot.layout.version !== 1 || !Array.isArray(snapshot.layout.modules) || snapshot.layout.modules.length !== 4 || new Set(snapshot.layout.modules.map(m => m.id)).size !== 4 || snapshot.layout.modules.some(m => !['shortcuts', 'tasks', 'notes', 'recent'].includes(m.id) || !['left', 'right', 'full'].includes(m.column) || typeof m.visible !== 'boolean' || !Number.isFinite(m.order))) throw Error('布局数据格式不正确');
  if (!snapshot.draft || typeof snapshot.draft.text !== 'string' || typeof snapshot.draft.id !== 'string') throw Error('草稿数据格式不正确');
  return snapshot;
}
