export interface SharedCacheOptions<V> {
  /** Bytes kept for values no one holds. The least recently released go first. */
  budget: number;
  sizeOf(value: V): number;
  dispose(value: V): void;
}

export interface CacheEntry<V> {
  readonly key: string;
  readonly value: V;
  refs: number;
  size: number;
}

/**
 * Values shared by key between their holders. A value is kept while anyone holds it, then lingers in
 * a bounded pool so that the next holder asking for it doesn't recreate it.
 */
export class SharedCache<V> {
  private entries = new Map<string, CacheEntry<V>>();
  /** Entries with no holders, least recently released first. */
  private idle = new Set<CacheEntry<V>>();
  private idleBytes = 0;

  constructor(private readonly options: SharedCacheOptions<V>) {}

  get size(): number {
    return this.entries.size;
  }

  get idleSize(): number {
    return this.idleBytes;
  }

  /** Holds the value for `key`, creating it if needed. Pair every call with `release`. */
  acquire(key: string, create: () => V): CacheEntry<V> {
    let entry = this.entries.get(key);
    if (!entry) {
      const value = create();
      entry = { key, value, refs: 0, size: this.options.sizeOf(value) };
      this.entries.set(key, entry);
    } else if (entry.refs === 0) {
      this.idle.delete(entry);
      this.idleBytes -= entry.size;
    }
    entry.refs++;
    return entry;
  }

  release(entry: CacheEntry<V>): void {
    if (entry.refs <= 0) return;
    entry.refs--;
    if (entry.refs > 0) return;
    if (this.entries.get(entry.key) !== entry) {
      // Dropped by `invalidate` while held.
      this.options.dispose(entry.value);
      return;
    }
    this.idle.add(entry);
    this.idleBytes += entry.size;
    this.trim(this.options.budget);
  }

  /** Disposes idle values until they fit in `bytes`. */
  trim(bytes: number): void {
    for (const entry of this.idle) {
      if (this.idleBytes <= bytes) break;
      this.idle.delete(entry);
      this.idleBytes -= entry.size;
      this.entries.delete(entry.key);
      this.options.dispose(entry.value);
    }
  }

  /** Forgets every value. Held ones stay valid for their holders and are disposed when released. */
  invalidate(): void {
    this.trim(0);
    this.entries.clear();
  }
}
