import { useEffect, useMemo, useRef, useState } from "react";
import { generateInsightWithProvider } from "../providers/openAiCompatible";
import type { InsightPanelContext } from "./insightPanelTypes";
import type { ModelProviderConfig, OutputLanguage, ParsedInsightResult } from "../shared/types";
import { getProviderSettings, selectActiveProvider } from "../storage/providerStorage";
import {
  getInlinePanelPreferences,
  saveInlinePanelPreferences,
  type InlinePanelFontSize
} from "../storage/inlinePanelPreferences";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function StructuredResult({ result }: { result: Extract<ParsedInsightResult, { kind: "structured" }> }) {
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

export function FallbackResult({ result }: { result: Extract<ParsedInsightResult, { kind: "fallback" }> }) {
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

export function InsightPanel({ context }: { context: InsightPanelContext }) {
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const isInline = context.source === "inline";
  const [activeProvider, setActiveProvider] = useState<ModelProviderConfig | undefined>();
  const [language, setLanguage] = useState<OutputLanguage>("zh-CN");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<InlinePanelFontSize>("large");
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

  useEffect(() => {
    if (!isInline) {
      return;
    }

    void getInlinePanelPreferences().then((preferences) => {
      if (isMountedRef.current) {
        setFontSize(preferences.fontSize);
      }
    });
  }, [isInline]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && settingsMenuRef.current?.contains(target)) {
        return;
      }

      setIsSettingsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    requestIdRef.current += 1;
    setIsGenerating(false);
    setIsCollapsed(false);
    setIsSettingsOpen(false);
    setError(undefined);
    setResult(undefined);
  }, [context.videoId]);

  const canGenerate = useMemo(
    () => hasLoadedSettings && Boolean(activeProvider) && !isGenerating,
    [activeProvider, hasLoadedSettings, isGenerating]
  );

  async function handleGenerateInsight() {
    if (!activeProvider) {
      setError("Configure a provider before generating insight.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsGenerating(true);
    setError(undefined);
    setResult(undefined);

    try {
      const transcript = await context.getTranscript();
      const generatedInsight = await generateInsightWithProvider(
        { transcript, outputLanguage: language },
        activeProvider
      );
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setResult(generatedInsight);
      }
    } catch (generateError: unknown) {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setError(getErrorMessage(generateError));
      }
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setIsGenerating(false);
      }
    }
  }

  function handleChangeFontSize(direction: "smaller" | "larger") {
    const fontSizes: InlinePanelFontSize[] = ["small", "default", "large", "xl"];
    const currentIndex = fontSizes.indexOf(fontSize);
    const nextIndex =
      direction === "larger"
        ? Math.min(currentIndex + 1, fontSizes.length - 1)
        : Math.max(currentIndex - 1, 0);
    const nextFontSize = fontSizes[nextIndex];

    if (nextFontSize === fontSize) {
      return;
    }

    setFontSize(nextFontSize);
    void saveInlinePanelPreferences({ fontSize: nextFontSize });
  }

  const transcriptStatus = context.getTranscriptStatus?.();
  const fontSizeLabel = fontSize === "xl" ? "XL" : fontSize[0].toUpperCase() + fontSize.slice(1);
  const panelContent = (
    <>
      <section className="panel-section" aria-label="Generation settings">
        {hasLoadedSettings && !activeProvider ? (
          <div className="notice">
            <h2>No provider configured</h2>
            <p>Add an OpenAI-compatible provider before generating insights.</p>
            <button type="button" onClick={() => context.openSettings?.()}>
              Open settings
            </button>
          </div>
        ) : null}

        {transcriptStatus ? <div className="transcript-tip">{transcriptStatus}</div> : null}

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
    </>
  );

  return (
    <main
      className={isInline ? "app-shell inline-panel-shell" : "app-shell"}
      data-inline-font-size={isInline ? fontSize : undefined}
    >
      <header className="app-header">
        <div>
          <h1>Video Insight</h1>
          <p>Open a YouTube video and generate transcript-based insights.</p>
        </div>
        {isInline ? (
          <div className="inline-panel-controls" ref={settingsMenuRef}>
            <button
              className="inline-settings-button"
              type="button"
              aria-label="Panel settings"
              aria-haspopup="menu"
              aria-expanded={isSettingsOpen}
              title="Panel settings"
              onClick={() => setIsSettingsOpen((value) => !value)}
            >
              ⚙
            </button>
            {isSettingsOpen ? (
              <div className="inline-settings-menu" role="menu" aria-label="Panel settings">
                <div className="settings-menu-section">
                  <span className="settings-menu-label">Text size</span>
                  <div className="font-size-controls" aria-label="Panel text size">
                    <button
                      type="button"
                      aria-label="Smaller text"
                      title="Smaller text"
                      disabled={fontSize === "small"}
                      onClick={() => handleChangeFontSize("smaller")}
                    >
                      A-
                    </button>
                    <span className="font-size-value" aria-live="polite">
                      {fontSizeLabel}
                    </span>
                    <button
                      type="button"
                      aria-label="Larger text"
                      title="Larger text"
                      disabled={fontSize === "xl"}
                      onClick={() => handleChangeFontSize("larger")}
                    >
                      A+
                    </button>
                  </div>
                </div>
                <button
                  className="settings-menu-action"
                  type="button"
                  aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
                  onClick={() => {
                    setIsCollapsed((value) => !value);
                    setIsSettingsOpen(false);
                  }}
                >
                  {isCollapsed ? "Expand panel" : "Collapse panel"}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {isInline ? (isCollapsed ? null : <div className="inline-panel-body">{panelContent}</div>) : panelContent}
    </main>
  );
}
