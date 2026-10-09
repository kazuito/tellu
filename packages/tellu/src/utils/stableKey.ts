const ids = new WeakMap<object, number>();
let nextId = 1;

/** A stable identity number for any object (used for filters, images and other non-data values). */
export function objectId(value: object): number {
  let id = ids.get(value);
  if (id === undefined) {
    id = nextId++;
    ids.set(value, id);
  }
  return id;
}

/**
 * Serializes plain data structurally and everything else (class instances, functions) by identity,
 * so equal-looking props created on every render produce the same key.
 */
export function stableKey(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return typeof value === "function" ? `f#${objectId(value)}` : (JSON.stringify(value) ?? "u");
  }
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return `#${objectId(value)}`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableKey(record[key])}`)
    .join(",")}}`;
}
