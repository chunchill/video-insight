import { useEffect, useMemo, useRef, useState } from "react";
import { generateInsightWithProvider } from "../providers/openAiCompatible";
import type {
  ModelProviderConfig,
  OutputLanguage,
  ParsedInsightResult,
  TranscriptPayload
} from "../shared/types";
import { getProviderSettings, selectActiveProvider } from "../storage/providerStorage";

type TranscriptResponse = { ok: true; transcript: TranscriptPayload } | { ok: false; reason: string };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function isTranscriptResponse(value: unknown): value is TranscriptResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<TranscriptResponse>;
  return response.ok === true || response.ok === false;
}

async function getActiveTranscript(): Promise<TranscriptPayload> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (activeTab?.id == null) {
    throw new Error("No active browser tab was found.");
  }

  const response = (await chrome.tabs.sendMessage(activeTab.id, {
    type: "VIDEO_INSIGHT_GET_TRANSCRIPT"
  })) as unknown;

  if (!isTranscriptResponse(response)) {
    throw new Error("The YouTube page did not return a transcript response.");
  }

  if (!response.ok) {
    throw new Error(response.reason);
  }

  return response.transcript;
}

function StructuredResult({ result }: { result: Extract<ParsedInsightResult, { kind: "structured" }> }) {
  const { data } = result;

  return (
    <section className="panel-section" aria-label="Generated insight">
      <article className="insight-card">
        <h2>Summary</h2>
        <p>{data.summary}</p>
      </article>

      {data.takeaways.length > 0 ? (
        <article className="insight-card">
          <h2>Key takeaways</h2>
          <ul className="insight-list">
            {data.takeaways.map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ul>
        </article>
      ) : null}

      {data.viewpoints.map((viewpoint, index) => (
        <details className="insight-card" key={`${viewpoint.title}-${index}`} open={index === 0}>
          <summary>{viewpoint.title || "Viewpoint"}</summary>
          {viewpoint.detail ? <p>{viewpoint.detail}</p> : null}
          {viewpoint.evidence.length > 0 ? (
            <ul className="insight-list">
              {viewpoint.evidence.map((evidence, evidenceIndex) => (
                <li key={`${evidence.text}-${evidenceIndex}`}>
                  {evidence.timestamp ? <strong>{evidence.timestamp}: </strong> : null}
                  {evidence.text}
                </li>
              ))}
            </ul>
          ) : null}
        </details>
      ))}

      {data.caveats.length > 0 ? (
        <article className="insight-card">
          <h2>Caveats</h2>
          <ul className="insight-list">
            {data.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}

function FallbackResult({ result }: { result: Extract<ParsedInsightResult, { kind: "fallback" }> }) {
  return (
    <section className="panel-section" aria-label="Generated insight">
      <article className="insight-card">
        <h2>Model output</h2>
        <p>{result.reason}</p>
        <pre>{result.text}</pre>
      </article>
    </section>
  );
}

export function SidePanelApp() {
  const isMountedRef = useRef(false);
  const [activeProvider, setActiveProvider] = useState<ModelProviderConfig | undefined>();
  const [language, setLanguage] = useState<OutputLanguage>("zh-CN");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<ParsedInsightResult | undefined>();

  useEffect(() => {
    isMountedRef.current = true;

    void getProviderSettings()
      .then((settings) => {
        if (!isMountedRef.current) {
          return;
        }

        setLanguage(settings.defaultLanguage);
        setActiveProvider(selectActiveProvider(settings));
        setHasLoadedSettings(true);
      })
      .catch((loadError: unknown) => {
        if (isMountedRef.current) {
          setHasLoadedSettings(true);
          setError(getErrorMessage(loadError));
        }
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const canGenerate = useMemo(
    () => hasLoadedSettings && Boolean(activeProvider) && !isGenerating,
    [activeProvider, hasLoadedSettings, isGenerating]
  );

  async function handleGenerateInsight() {
    if (!activeProvider) {
      setError("Configure a provider before generating insight.");
      return;
    }

    setIsGenerating(true);
    setError(undefined);
    setResult(undefined);

    try {
      const transcript = await getActiveTranscript();
      const generatedInsight = await generateInsightWithProvider(
        { transcript, outputLanguage: language },
        activeProvider
      );
      if (isMountedRef.current) {
        setResult(generatedInsight);
      }
    } catch (generateError: unknown) {
      if (isMountedRef.current) {
        setError(getErrorMessage(generateError));
      }
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Video Insight</h1>
        <p>Open a YouTube video and generate transcript-based insights.</p>
      </header>

      <section className="panel-section" aria-label="Generation settings">
        {hasLoadedSettings && !activeProvider ? (
          <div className="notice">
            <h2>No provider configured</h2>
            <p>Add an OpenAI-compatible provider before generating insights.</p>
            <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
              Open settings
            </button>
          </div>
        ) : null}

        <label className="form-control">
          <span>Output language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as OutputLanguage)}>
            <option value="zh-CN">Chinese (Simplified)</option>
            <option value="en">English</option>
          </select>
        </label>

        <button className="primary-button" type="button" disabled={!canGenerate} onClick={handleGenerateInsight}>
          {isGenerating ? "Generating..." : "Generate insight"}
        </button>
      </section>

      {error ? <div className="error-box">{error}</div> : null}

      {result?.kind === "structured" ? <StructuredResult result={result} /> : null}
      {result?.kind === "fallback" ? <FallbackResult result={result} /> : null}
    </main>
  );
}
