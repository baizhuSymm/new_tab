import { test, expect } from 'vitest';
import { createRepository } from '../src/data/repository';
import { memoryAdapter } from './fixtures';

test('failed read does not overwrite existing data', async () => {
  const adapter = memoryAdapter({ 'schemaVersion': 1 });
  adapter.readAll = async () => { throw Error('read failed'); };
  await expect(createRepository(adapter).load()).rejects.toThrow('read failed');
  expect(adapter.data).toEqual({ schemaVersion: 1 });
});
test('independent clients preserve distinct tasks', async () => {
  const adapter = memoryAdapter();
  const a = createRepository(adapter), b = createRepository(adapter);
  await a.load();
  const task = { title: '任务', description: '', dueDate: null, dueTime: null, completedAt: null, order: 0, updatedAt: 1 };
  await Promise.all([a.save('task', { ...task, id: 'a' }), b.save('task', { ...task, id: 'b' })]);
  expect((await a.load()).tasks.map(t => t.id).sort()).toEqual(['a', 'b']);
});
test('deleted seed sites do not reappear on initialization', async () => {
  const repo = createRepository(memoryAdapter());
  for (const site of (await repo.load()).shortcuts) await repo.remove('shortcut', site.id);
  expect((await repo.load()).shortcuts).toEqual([]);
});
test('quota error leaves old record intact', async () => {
  const adapter = memoryAdapter(); const repo = createRepository(adapter); await repo.load();
  adapter.write = async () => { throw Error('quota exceeded'); };
  await expect(repo.saveSettings({ searchEngine: 'google' })).rejects.toThrow('quota');
  expect((await repo.load()).settings.searchEngine).toBe('bing');
});
test('committing an old draft preserves a newer draft and is idempotent', async () => {
  const repo = createRepository(memoryAdapter()); await repo.load();
  const old = { id: 'n1', text: '旧记录', updatedAt: 1 };
  const newer = { id: 'n2', text: '新草稿', updatedAt: 2 };
  await repo.saveDraft(newer);
  await repo.commitDraft(old); await repo.commitDraft(old);
  const state = await repo.load();
  expect(state.notes).toHaveLength(1); expect(state.draft).toEqual(newer);
});
test('recent sites are deduplicated and capped at 20', async () => {
  const repo = createRepository(memoryAdapter()); await repo.load();
  for (let i = 0; i < 22; i++) await repo.recordRecent({ id: `r${i}`, url: `https://site${i}.com/`, name: `site${i}`, icon: '', openedAt: i });
  await repo.recordRecent({ id: 'other', url: 'https://site21.com/', name: 'latest', icon: '', openedAt: 100 });
  expect((await repo.load()).recent).toHaveLength(20);
  await repo.saveSettings({ recordRecent: false });
  await repo.recordRecent({ id: 'off', url: 'https://off.com', name: 'off', icon: '', openedAt: 200 });
  expect((await repo.load()).recent.some(r => r.id === 'off')).toBe(false);
});
