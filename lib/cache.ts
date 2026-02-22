import { storage } from './storage';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCached<T>(key: string, ttl = DEFAULT_TTL): Promise<T | null> {
  const entry = await storage.getLocal(`cache:${key}` as any);
  if (!entry) return null;
  const { data, ts } = entry as { data: T; ts: number };
  if (Date.now() - ts > ttl) return null;
  return data;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  await storage.setLocal(`cache:${key}` as any, { data, ts: Date.now() } as any);
}

export async function invalidateCache(prefix: string): Promise<void> {
  const all = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(all).filter((k) => k.startsWith(`cache:${prefix}`));
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
}
