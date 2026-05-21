import { vi } from "vitest";

type StorageArea = Record<string, unknown>;

const storage: StorageArea = {};

export function installChromeMock() {
  Object.assign(globalThis, {
    chrome: {
      storage: {
        local: {
          get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
            if (typeof keys === "string") {
              return { [keys]: storage[keys] };
            }
            if (Array.isArray(keys)) {
              return Object.fromEntries(keys.map((key) => [key, storage[key]]));
            }
            if (keys && typeof keys === "object") {
              return Object.fromEntries(Object.keys(keys).map((key) => [key, storage[key] ?? keys[key]]));
            }
            return { ...storage };
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(storage, items);
          }),
          clear: vi.fn(async () => {
            for (const key of Object.keys(storage)) {
              delete storage[key];
            }
          })
        }
      },
      runtime: {
        openOptionsPage: vi.fn()
      }
    }
  });
}
