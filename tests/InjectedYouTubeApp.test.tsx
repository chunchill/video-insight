import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InjectedYouTubeApp } from "../src/content/InjectedYouTubeApp";
import { installChromeMock } from "../src/test/chromeMock";

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
  chrome.runtime.sendMessage = vi.fn(async () => undefined);
});

describe("InjectedYouTubeApp", () => {
  it("asks the background script to open settings from the inline panel", async () => {
    render(<InjectedYouTubeApp videoId="abc123" />);

    await userEvent.click(await screen.findByRole("button", { name: "Open settings" }));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "VIDEO_INSIGHT_OPEN_OPTIONS" });
  });
});
