import { vi } from "vitest";

type StorageArea = Record<string, unknown>;

const storage: StorageArea = {};

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  if (value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function installChromeMock() {
  Object.assign(globalThis, {
    chrome: {
      storage: {
        local: {
          get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
            if (typeof keys === "string") {
              return { [keys]: cloneValue(storage[keys]) };
            }
            if (Array.isArray(keys)) {
              return Object.fromEntries(keys.map((key) => [key, cloneValue(storage[key])]));
            }
            if (keys && typeof keys === "object") {
              return Object.fromEntries(
                Object.keys(keys).map((key) => [
                  key,
                  cloneValue(Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : keys[key])
                ])
              );
            }
            return cloneValue(storage);
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(storage, cloneValue(items));
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
