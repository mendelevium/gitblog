import type { ColorMode, RepoInfo } from './types';

// chrome.storage.sync — persisted, synced across devices
interface SyncStorage {
  token: string;
  repo: RepoInfo;
  colorMode: ColorMode;
}

// chrome.storage.local — local-only, cache and queued ops
interface LocalStorage {
  [key: `cache:${string}`]: { data: unknown; ts: number };
  offlineQueue: QueuedOperation[];
}

export interface QueuedOperation {
  id: string;
  method: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
  sha?: string;
  message: string;
  ts: number;
}

async function getSync<K extends keyof SyncStorage>(key: K): Promise<SyncStorage[K] | undefined> {
  const result = await chrome.storage.sync.get(key);
  return result[key];
}

async function setSync<K extends keyof SyncStorage>(key: K, value: SyncStorage[K]): Promise<void> {
  await chrome.storage.sync.set({ [key]: value });
}

async function removeSync<K extends keyof SyncStorage>(key: K): Promise<void> {
  await chrome.storage.sync.remove(key);
}

async function getLocal<K extends keyof LocalStorage>(key: K): Promise<LocalStorage[K] | undefined> {
  const result = await chrome.storage.local.get(key as string);
  return result[key as string];
}

async function setLocal<K extends keyof LocalStorage>(key: K, value: LocalStorage[K]): Promise<void> {
  await chrome.storage.local.set({ [key as string]: value });
}

async function removeLocal<K extends keyof LocalStorage>(key: K): Promise<void> {
  await chrome.storage.local.remove(key as string);
}

export const storage = {
  getToken: () => getSync('token'),
  setToken: (token: string) => setSync('token', token),
  removeToken: () => removeSync('token'),

  getRepo: () => getSync('repo'),
  setRepo: (repo: RepoInfo) => setSync('repo', repo),
  removeRepo: () => removeSync('repo'),

  getColorMode: () => getSync('colorMode'),
  setColorMode: (mode: ColorMode) => setSync('colorMode', mode),

  getLocal,
  setLocal,
  removeLocal,

  onChanged(cb: (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => void) {
    chrome.storage.onChanged.addListener(cb);
    return () => chrome.storage.onChanged.removeListener(cb);
  },
};
