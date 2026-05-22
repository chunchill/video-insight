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
});
