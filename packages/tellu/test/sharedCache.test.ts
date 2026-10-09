import { describe, expect, test } from "bun:test";
import { SharedCache } from "../src/render/sharedCache";

function cache(budget: number) {
  const created: string[] = [];
  const disposed: string[] = [];
  const shared = new SharedCache<string>({ budget, sizeOf: () => 10, dispose: (value) => disposed.push(value) });
  const acquire = (key: string) =>
    shared.acquire(key, () => {
      created.push(key);
      return key;
    });
  return { shared, acquire, created, disposed };
}

describe("SharedCache", () => {
  test("shares a value between holders", () => {
    const { acquire, created } = cache(0);
    const a = acquire("a");
    const b = acquire("a");
    expect(a).toBe(b);
    expect(a.refs).toBe(2);
    expect(created).toEqual(["a"]);
  });

  test("keeps released values within the budget and reuses them", () => {
    const { shared, acquire, created, disposed } = cache(20);
    for (const key of ["a", "b", "c"]) shared.release(acquire(key));
    expect(disposed).toEqual(["a"]);
    expect(shared.idleSize).toBe(20);
    acquire("b");
    expect(created).toEqual(["a", "b", "c"]);
    expect(shared.idleSize).toBe(10);
  });

  test("evicts the least recently released first", () => {
    const { shared, acquire, disposed } = cache(20);
    const a = acquire("a");
    const b = acquire("b");
    shared.release(b);
    shared.release(a);
    shared.release(acquire("c"));
    expect(disposed).toEqual(["b"]);
  });

  test("never disposes a held value", () => {
    const { shared, acquire, disposed } = cache(0);
    const a = acquire("a");
    shared.trim(0);
    expect(disposed).toEqual([]);
    shared.release(a);
    expect(disposed).toEqual(["a"]);
  });

  test("invalidate recreates values and disposes held ones on release", () => {
    const { shared, acquire, created, disposed } = cache(100);
    const held = acquire("a");
    shared.release(acquire("b"));
    shared.invalidate();
    expect(disposed).toEqual(["b"]);
    const fresh = acquire("a");
    expect(fresh).not.toBe(held);
    expect(created).toEqual(["a", "b", "a"]);
    shared.release(held);
    expect(disposed).toEqual(["b", "a"]);
    expect(shared.size).toBe(1);
  });
});
