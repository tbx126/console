import { useCallback, useEffect, useSyncExternalStore } from 'react';

/**
 * 前端唯一的请求缓存（L1）。
 *
 * - 以 key 缓存结果，带 TTL；同一 key 的并发请求只发一次。
 * - 写操作之后调用 invalidate(prefix)，命中前缀的条目立即过期，
 *   正在显示这些数据的组件会自动重新获取。
 * - key 约定为接口路径（如 "/travel/flights"），因此 invalidate("/travel")
 *   会刷新整个旅行模块。
 */

const MAX_ENTRIES = 200;
const entries = new Map(); // key -> { data, error, updatedAt, expiresAt, promise }
const listeners = new Set();
const stats = { hits: 0, misses: 0, invalidations: 0 };
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isFresh(entry) {
  return Boolean(entry && entry.updatedAt && entry.expiresAt > Date.now());
}

function trim() {
  while (entries.size > MAX_ENTRIES) {
    entries.delete(entries.keys().next().value);
  }
}

export function fetchQuery(key, fetcher, { ttl = 30_000, force = false } = {}) {
  const entry = entries.get(key);
  if (!force && isFresh(entry)) {
    stats.hits += 1;
    return Promise.resolve(entry.data);
  }
  if (entry?.promise) return entry.promise;
  stats.misses += 1;

  const promise = Promise.resolve()
    .then(fetcher)
    .then(
      (data) => {
        entries.set(key, { data, error: null, updatedAt: Date.now(), expiresAt: Date.now() + ttl, promise: null });
        trim();
        notify();
        return data;
      },
      (error) => {
        const previous = entries.get(key);
        entries.set(key, { ...previous, error, promise: null, expiresAt: 0 });
        notify();
        throw error;
      },
    );
  entries.set(key, { ...entry, promise });
  notify();
  return promise;
}

export function getQueryData(key) {
  return entries.get(key)?.data;
}

export function setQueryData(key, data, ttl = 30_000) {
  entries.set(key, { data, error: null, updatedAt: Date.now(), expiresAt: Date.now() + ttl, promise: null });
  notify();
}

/** 让以 prefix 开头的缓存过期；不传则全部过期。数据保留以便刷新期间继续显示。 */
export function invalidate(prefix = '') {
  let changed = false;
  for (const [key, entry] of entries) {
    if (key.startsWith(prefix) && (entry.expiresAt !== 0 || entry.error)) {
      entries.set(key, { ...entry, expiresAt: 0, error: null });
      changed = true;
    }
  }
  if (changed) {
    stats.invalidations += 1;
    notify();
  }
}

export function clearQueries() {
  entries.clear();
  notify();
}

export function queryStats() {
  const total = stats.hits + stats.misses;
  return {
    entries: entries.size,
    fresh: [...entries.values()].filter(isFresh).length,
    ...stats,
    hitRate: total ? stats.hits / total : 0,
  };
}

/**
 * 读取并订阅一个查询。返回 { data, error, isLoading, isFetching, refetch }。
 * key 为 null 时不请求。
 */
export function useQuery(key, fetcher, { ttl = 30_000 } = {}) {
  const snapshot = useSyncExternalStore(subscribe, () => version);
  const entry = key ? entries.get(key) : undefined;
  const stale = key && !isFresh(entry) && !entry?.promise && !entry?.error;

  useEffect(() => {
    if (stale) fetchQuery(key, fetcher, { ttl }).catch(() => {});
    // fetcher 由 key 唯一确定，不作为依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stale, ttl, snapshot]);

  const refetch = useCallback(() => (key ? fetchQuery(key, fetcher, { ttl, force: true }) : Promise.resolve()), [key, fetcher, ttl]);

  return {
    data: entry?.data,
    error: entry?.error ?? null,
    isLoading: Boolean(key) && entry?.data === undefined && !entry?.error,
    isFetching: Boolean(entry?.promise),
    refetch,
  };
}
