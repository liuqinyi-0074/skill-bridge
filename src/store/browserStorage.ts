// One synchronous safe facade for every browser-storage consumer, plus redux-persist's async adapter.
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}
export function createSafeStorage(providers: Array<() => StorageLike>) {
  const mirror = new Map<string, string>();
  const removed = new Set<string>();
  let index = 0;
  let current: StorageLike | null = null;
  function snapshot() {
    if (!current) return;
    try {
      for (let i = 0; i < current.length; i++) {
        const key = current.key(i);
        if (key === null || removed.has(key) || mirror.has(key)) continue;
        const value = current.getItem(key);
        if (value !== null) mirror.set(key, value);
      }
    } catch {
      /* Keep everything that could be read safely. */
    }
  }
  function select(): StorageLike | null {
    while (!current && index < providers.length) {
      try {
        // Storage property getters are called INSIDE this try.
        const candidate = providers[index]();
        candidate.getItem("__skillbridge_storage_probe__");
        current = candidate;
        snapshot();
        if (index > 0) {
          for (const [key, value] of mirror) candidate.setItem(key, value);
          for (const key of removed) candidate.removeItem(key);
        }
      } catch {
        current = null;
        index++;
      }
    }
    return current;
  }
  function run<T>(
    operation: (storage: StorageLike) => T,
    fallback: () => T,
  ): T {
    while (select()) {
      try {
        return operation(current!);
      } catch {
        snapshot();
        current = null;
        index++;
      }
    }
    return fallback();
  }
  return {
    getItem(key: string): string | null {
      return run(
        (storage) => {
          const value = storage.getItem(key);
          if (value !== null) mirror.set(key, value);
          else mirror.delete(key);
          return value;
        },
        () => mirror.get(key) ?? null,
      );
    },
    setItem(key: string, value: string): void {
      mirror.set(key, value);
      removed.delete(key);
      run(
        (storage) => storage.setItem(key, value),
        () => undefined,
      );
    },
    removeItem(key: string): void {
      mirror.delete(key);
      removed.add(key);
      run(
        (storage) => storage.removeItem(key),
        () => undefined,
      );
    },
    getAllKeys(): string[] {
      return run(
        (storage) => {
          const keys: string[] = [];
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key !== null) keys.push(key);
          }
          return keys;
        },
        () => Array.from(mirror.keys()),
      );
    },
  };
}
export const safeStorage = createSafeStorage(
  typeof window === "undefined"
    ? []
    : [() => window.localStorage, () => window.sessionStorage],
);
function persistedValue(key: string): string | null {
  const value = safeStorage.getItem(key);
  if (value === null || !key.startsWith("persist:")) return value;
  try {
    const root: unknown = JSON.parse(value);
    if (typeof root !== "object" || root === null || Array.isArray(root))
      throw new Error("Invalid saved root");
    for (const item of Object.values(root)) {
      if (typeof item !== "string") throw new Error("Invalid saved field");
      JSON.parse(item);
    }
    return value;
  } catch {
    safeStorage.removeItem(key);
    return null;
  }
}
const browserStorage = {
  getItem: (key: string) => Promise.resolve(persistedValue(key)),
  setItem: (key: string, value: string) => {
    safeStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    safeStorage.removeItem(key);
    return Promise.resolve();
  },
  getAllKeys: () => Promise.resolve(safeStorage.getAllKeys()),
};
export default browserStorage;
