import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { generateInsightWithProvider } from "../src/providers/openAiCompatible";
import { InsightPanel } from "../src/insight/InsightPanel";
import type { InsightPanelContext } from "../src/insight/insightPanelTypes";
import { saveProviderSettings } from "../src/storage/providerStorage";
import { installChromeMock } from "../src/test/chromeMock";
import type { ParsedInsightResult, TranscriptPayload } from "../src/shared/types";

vi.mock("../src/providers/openAiCompatible", () => ({
  generateInsightWithProvider: vi.fn()
}));

const transcript: TranscriptPayload = {
  videoMeta: { url: "https://www.youtube.com/watch?v=abc123", title: "AI Talk" },
  segments: [{ start: "0:03", text: "AI systems change workflows." }],
  plainText: "[0:03] AI systems change workflows."
};

const structuredInsight: ParsedInsightResult = {
  kind: "structured",
  rawText: "{}",
  data: {
    summary: "AI changes complete workflows.",
    takeaways: ["Context matters"],
    viewpoints: [
      {
        title: "Workflow shift",
        detail: "The transcript argues complete workflows matter more than isolated tasks.",
        evidence: [{ timestamp: "0:03", text: "AI systems change workflows." }]
      }
    ],
    caveats: ["Transcript may omit visual context."],
    audience: ["AI product builders"]
  }
};

function context(overrides: Partial<InsightPanelContext> = {}): InsightPanelContext {
  return {
    source: "sidepanel",
    videoId: "abc123",
    getTranscript: vi.fn(async () => transcript),
    ...overrides
  };
}

async function saveProvider() {
  await saveProviderSettings({
    providers: [
      {
        id: "provider-1",
        name: "OpenAI",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test",
        model: "gpt-4.1-mini",
        enabled: true
      }
    ],
    selectedProviderId: "provider-1",
    defaultLanguage: "zh-CN"
  });
}

beforeEach(async () => {
  installChromeMock();
  await chrome.storage.local.clear();
  vi.mocked(generateInsightWithProvider).mockReset();
});

describe("InsightPanel", () => {
  it("resets result and error when context video changes", async () => {
    await saveProvider();
    const getTranscript = vi.fn(async () => transcript);
    vi.mocked(generateInsightWithProvider)
      .mockResolvedValueOnce(structuredInsight)
      .mockRejectedValueOnce(new Error("Transcript unavailable"));

    const { rerender } = render(<InsightPanel context={context({ videoId: "abc123", getTranscript })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));

    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();

    rerender(<InsightPanel context={context({ videoId: "xyz789", getTranscript })} />);
    expect(screen.queryByText("AI changes complete workflows.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Generate insight" }));
    expect(await screen.findByText("Transcript unavailable")).toBeInTheDocument();

    rerender(<InsightPanel context={context({ videoId: "new456", getTranscript })} />);
    expect(screen.queryByText("Transcript unavailable")).not.toBeInTheDocument();
  });

  it("renders transcript support status and generated structured insight", async () => {
    await saveProvider();
    vi.mocked(generateInsightWithProvider).mockResolvedValue(structuredInsight);

    render(
      <InsightPanel
        context={context({
          getTranscriptStatus: () => "Transcript is available for this video."
        })}
      />
    );

    expect(await screen.findByText("Transcript is available for this video.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Generate insight" }));

    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();
    expect(screen.getByText("Context matters")).toBeInTheDocument();
    expect(screen.getByText("Workflow shift")).toBeInTheDocument();
    expect(screen.getByText("Transcript may omit visual context.")).toBeInTheDocument();
    expect(generateInsightWithProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        outputLanguage: "zh-CN",
        transcript: expect.objectContaining({
          plainText: "[0:03] AI systems change workflows."
        })
      }),
      expect.objectContaining({
        id: "provider-1",
        model: "gpt-4.1-mini"
      })
    );
  });

  it("loads and displays transcript before generation", async () => {
    await saveProvider();
    vi.mocked(generateInsightWithProvider).mockResolvedValue(structuredInsight);
    const getTranscript = vi.fn(async () => transcript);

    render(<InsightPanel context={context({ source: "inline", getTranscript })} />);

    await userEvent.click(await screen.findByRole("button", { name: "Show transcript" }));

    expect(await screen.findByText("[0:03] AI systems change workflows.")).toBeInTheDocument();
    expect(getTranscript).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Generate insight" }));
    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();
    expect(getTranscript).toHaveBeenCalledTimes(2);
  });

  it("uses context settings action when no provider exists", async () => {
    const openSettings = vi.fn();

    render(<InsightPanel context={context({ openSettings })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Open settings" }));

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.openOptionsPage).not.toHaveBeenCalled();
  });

  it("ignores stale generation results after video changes", async () => {
    await saveProvider();
    let resolveInsight: (result: ParsedInsightResult) => void = () => {};
    vi.mocked(generateInsightWithProvider).mockReturnValue(
      new Promise((resolve) => {
        resolveInsight = resolve;
      })
    );

    const { rerender } = render(<InsightPanel context={context({ videoId: "abc123" })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));

    rerender(<InsightPanel context={context({ videoId: "xyz789" })} />);
    resolveInsight(structuredInsight);

    await waitFor(() => {
      expect(screen.queryByText("AI changes complete workflows.")).not.toBeInTheDocument();
    });
  });

  it("shows inline-only reading controls and collapses the panel body", async () => {
    await saveProvider();
    const { container } = render(<InsightPanel context={context({ source: "inline" })} />);

    expect(await screen.findByRole("button", { name: "Collapse panel" })).toBeInTheDocument();
    expect(container.querySelector(".inline-panel-body")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generate insight" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Collapse panel" }));

    expect(screen.queryByRole("menu", { name: "Panel settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate insight" })).not.toBeInTheDocument();
    expect(container.querySelector(".inline-panel-body")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Expand panel" }));

    expect(screen.getByRole("button", { name: "Generate insight" })).toBeInTheDocument();
  });

  it("uses one settings dropdown for inline panel controls", async () => {
    await saveProvider();
    render(<InsightPanel context={context({ source: "inline" })} />);

    const settingsButton = await screen.findByRole("button", { name: "Panel settings" });

    expect(settingsButton).toHaveAttribute("title", "Panel settings");
    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
    expect(settingsButton).toHaveTextContent("⚙");
    expect(screen.getByRole("button", { name: "Smaller text" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse panel" })).toBeInTheDocument();

    await userEvent.click(settingsButton);

    expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "Panel settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export model configuration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import model configuration" })).toBeInTheDocument();

    await userEvent.click(document.body);

    expect(screen.queryByRole("menu", { name: "Panel settings" })).not.toBeInTheDocument();
    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
  });

  it("persists inline panel font size preferences", async () => {
    await saveProvider();
    const { container } = render(<InsightPanel context={context({ source: "inline" })} />);

    const shell = await waitFor(() => {
      const element = container.querySelector<HTMLElement>(".app-shell");
      if (!element) {
        throw new Error("Expected app shell to render.");
      }
      return element;
    });

    expect(shell.dataset.inlineFontSize).toBe("large");

    await userEvent.click(screen.getByRole("button", { name: "Larger text" }));

    expect(shell.dataset.inlineFontSize).toBe("xl");
    await expect(chrome.storage.local.get("videoInsight.inlinePanelPreferences")).resolves.toEqual({
      "videoInsight.inlinePanelPreferences": { fontSize: "xl" }
    });
  });

  it("does not show inline reading controls in the side panel", async () => {
    await saveProvider();
    const { container } = render(<InsightPanel context={context({ source: "sidepanel" })} />);

    expect(await screen.findByRole("button", { name: "Generate insight" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Panel settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Smaller text" })).not.toBeInTheDocument();
    expect(container.querySelector(".inline-panel-body")).toBeNull();
  });

  it("restores saved insight when returning to the same video", async () => {
    await saveProvider();
    vi.mocked(generateInsightWithProvider).mockResolvedValue(structuredInsight);

    const { unmount } = render(<InsightPanel context={context({ source: "inline", videoId: "abc123" })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Generate insight" }));
    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();
    unmount();

    render(<InsightPanel context={context({ source: "inline", videoId: "abc123" })} />);

    expect(await screen.findByText("AI changes complete workflows.")).toBeInTheDocument();
    expect(screen.getByText("Saved insight restored for this video.")).toBeInTheDocument();
  });
});
