import { beforeEach, describe, expect, it, vi } from "vitest";

type MessageListener = (message: unknown) => boolean | undefined;

let runtimeMessageListener: MessageListener | undefined;

beforeEach(() => {
  vi.resetModules();
  runtimeMessageListener = undefined;

  Object.assign(globalThis, {
    chrome: {
      runtime: {
        onInstalled: {
          addListener: vi.fn()
        },
        onMessage: {
          addListener: vi.fn((listener: MessageListener) => {
            runtimeMessageListener = listener;
          })
        },
        openOptionsPage: vi.fn()
      },
      sidePanel: {
        setPanelBehavior: vi.fn()
      }
    }
  });
});

describe("background", () => {
  it("opens options page when requested by the inline panel", async () => {
    await import("../src/background/background");

    expect(runtimeMessageListener?.({ type: "VIDEO_INSIGHT_OPEN_OPTIONS" })).toBe(false);
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });
});
