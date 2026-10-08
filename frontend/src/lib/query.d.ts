export function fetchQuery<T>(key: string, fetcher: () => T | Promise<T>, options?: { ttl?: number; force?: boolean }): Promise<T>;
export function getQueryData<T = unknown>(key: string): T | undefined;
export function setQueryData(key: string, data: unknown, ttl?: number): void;
export function invalidate(prefix?: string): void;
export function clearQueries(): void;
export function queryStats(): { entries: number; fresh: number; hits: number; misses: number; invalidations: number; hitRate: number };
export function useQuery<T>(key: string | null, fetcher: () => T | Promise<T>, options?: { ttl?: number }): {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<T | void>;
};
