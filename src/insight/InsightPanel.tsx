import { useEffect, useMemo, useRef, useState } from "react";
import { generateInsightWithProvider } from "../providers/openAiCompatible";
import type { InsightPanelContext } from "./insightPanelTypes";
import type { ModelProviderConfig, OutputLanguage, ParsedInsightResult, TranscriptPayload } from "../shared/types";
import { getProviderSettings, saveProviderSettings, selectActiveProvider } from "../storage/providerStorage";
import { downloadTextFile } from "../shared/downloadFile";
import { buildInsightMarkdown, createSafeFilename } from "./insightExport";
import { getSavedInsight, saveInsightRecord } from "../storage/insightHistory";
import {
  getInlinePanelPreferences,
  saveInlinePanelPreferences,
  type InlinePanelFontSize
} from "../storage/inlinePanelPreferences";
import {
  createProviderSettingsBackup,
  parseProviderSettingsBackup
} from "../storage/providerSettingsBackup";

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
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const isInline = context.source === "inline";
  const [activeProvider, setActiveProvider] = useState<ModelProviderConfig | undefined>();
  const [language, setLanguage] = useState<OutputLanguage>("zh-CN");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [fontSize, setFontSize] = useState<InlinePanelFontSize>("large");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [transcript, setTranscript] = useState<TranscriptPayload | undefined>();
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
    let isCurrentVideo = true;
    requestIdRef.current += 1;
    setIsGenerating(false);
    setIsLoadingTranscript(false);
    setIsCollapsed(false);
    setIsSettingsOpen(false);
    setIsTranscriptOpen(false);
    setTranscript(undefined);
    setError(undefined);
    setNotice(undefined);
    setResult(undefined);

    void getSavedInsight(context.videoId).then((savedInsight) => {
      if (!isMountedRef.current || !isCurrentVideo || !savedInsight) {
        return;
      }

      setTranscript(savedInsight.transcript);
      setLanguage(savedInsight.outputLanguage);
      setResult(savedInsight.result);
      setNotice("Saved insight restored for this video.");
    });

    return () => {
      isCurrentVideo = false;
    };
  }, [context.videoId]);

  const canGenerate = useMemo(
    () => hasLoadedSettings && Boolean(activeProvider) && !isGenerating && !isLoadingTranscript,
    [activeProvider, hasLoadedSettings, isGenerating, isLoadingTranscript]
  );

  async function loadTranscript(): Promise<TranscriptPayload> {
    setIsLoadingTranscript(true);
    setError(undefined);
    setNotice("Loading transcript...");

    try {
      const loadedTranscript = await context.getTranscript();
      if (isMountedRef.current) {
        setTranscript(loadedTranscript);
        setNotice("Transcript loaded.");
      }
      return loadedTranscript;
    } finally {
      if (isMountedRef.current) {
        setIsLoadingTranscript(false);
      }
    }
  }

  async function handleGenerateInsight() {
    if (!activeProvider) {
      setError("Configure a provider before generating insight.");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsGenerating(true);
    setError(undefined);
    setNotice(undefined);
    setResult(undefined);

    try {
      const loadedTranscript = await loadTranscript();
      const generatedInsight = await generateInsightWithProvider(
        { transcript: loadedTranscript, outputLanguage: language },
        activeProvider
      );
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setResult(generatedInsight);
        if (context.videoId) {
          await saveInsightRecord({
            videoId: context.videoId,
            transcript: loadedTranscript,
            outputLanguage: language,
            result: generatedInsight
          });
        }
        setNotice("Insight saved for this video.");
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

  async function handleShowTranscript() {
    setIsTranscriptOpen(true);
    if (transcript) {
      return;
    }

    try {
      await loadTranscript();
    } catch (loadError: unknown) {
      if (isMountedRef.current) {
        setError(getErrorMessage(loadError));
        setNotice(undefined);
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

  async function handleExportProviderSettings() {
    const settings = await getProviderSettings();
    downloadTextFile(
      `video-insight-provider-settings-${new Date().toISOString().slice(0, 10)}.json`,
      createProviderSettingsBackup(settings),
      "application/json"
    );
    setIsSettingsOpen(false);
  }

  async function handleImportProviderSettings(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const importedSettings = parseProviderSettingsBackup(await file.text());
      await saveProviderSettings(importedSettings);
      if (isMountedRef.current) {
        setLanguage(importedSettings.defaultLanguage);
        setActiveProvider(selectActiveProvider(importedSettings));
        setNotice("Model configuration imported.");
        setError(undefined);
        setIsSettingsOpen(false);
      }
    } catch (importError: unknown) {
      if (isMountedRef.current) {
        setError(getErrorMessage(importError));
      }
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function handleExportInsight() {
    if (!transcript || !result) {
      setError("Generate or restore an insight before exporting.");
      return;
    }

    downloadTextFile(
      createSafeFilename(transcript.videoMeta.title, "md"),
      buildInsightMarkdown({ transcript, result, outputLanguage: language }),
      "text/markdown"
    );
  }

  const transcriptStatus = context.getTranscriptStatus?.();
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
        {notice ? <div className="transcript-tip">{notice}</div> : null}

        <label className="form-control">
          <span>Output language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as OutputLanguage)}>
            <option value="zh-CN">Chinese (Simplified)</option>
            <option value="en">English</option>
          </select>
        </label>

        <button className="primary-button" type="button" disabled={!canGenerate} onClick={handleGenerateInsight}>
          {isLoadingTranscript ? "Loading transcript..." : isGenerating ? "Generating..." : "Generate insight"}
        </button>

        <button className="secondary-button" type="button" onClick={handleShowTranscript} disabled={isLoadingTranscript}>
          {isTranscriptOpen ? "Refresh transcript" : "Show transcript"}
        </button>
      </section>

      {error ? <div className="error-box">{error}</div> : null}

      {isTranscriptOpen ? (
        <section className="panel-section" aria-label="Transcript">
          <article className="insight-card transcript-card">
            <h2>Transcript</h2>
            {transcript ? (
              <pre>{transcript.plainText}</pre>
            ) : (
              <p>{isLoadingTranscript ? "Loading transcript..." : "Transcript has not loaded yet."}</p>
            )}
          </article>
        </section>
      ) : null}

      {result?.kind === "structured" ? <StructuredResult result={result} /> : null}
      {result?.kind === "fallback" ? <FallbackResult result={result} /> : null}

      {isInline ? (
        <div className="inline-result-actions" aria-label="Insight text controls">
          <button type="button" aria-label="Export insight" title="Export insight" onClick={handleExportInsight}>
            ⇩
          </button>
          <button
            type="button"
            aria-label="Smaller text"
            title="Smaller text"
            disabled={fontSize === "small"}
            onClick={() => handleChangeFontSize("smaller")}
          >
            A-
          </button>
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
      ) : null}
    </>
  );

  return (
    <main
      className={isInline ? "app-shell inline-panel-shell" : "app-shell"}
      data-inline-font-size={isInline ? fontSize : undefined}
      data-inline-collapsed={isInline ? isCollapsed : undefined}
      data-settings-open={isInline ? isSettingsOpen : undefined}
    >
      <header className="app-header">
        <div>
          <h1>Video Insight</h1>
          <p>Open a YouTube video and generate transcript-based insights.</p>
        </div>
        {isInline ? (
          <div className="inline-panel-controls" ref={settingsMenuRef}>
            <button
              className="inline-header-icon-button"
              type="button"
              aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
              title={isCollapsed ? "Expand panel" : "Collapse panel"}
              onClick={() => setIsCollapsed((value) => !value)}
            >
              {isCollapsed ? "⌄" : "⌃"}
            </button>
            <button
              className="inline-header-icon-button"
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
                  <span className="settings-menu-label">Model configuration</span>
                  <button className="settings-menu-action" type="button" onClick={handleExportProviderSettings}>
                    Export model configuration
                  </button>
                  <button
                    className="settings-menu-action"
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                  >
                    Import model configuration
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="visually-hidden-input"
                    aria-label="Provider settings file"
                    onChange={(event) => {
                      void handleImportProviderSettings(event.currentTarget.files?.[0]);
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {isInline ? (isCollapsed ? null : <div className="inline-panel-body">{panelContent}</div>) : panelContent}
    </main>
  );
}
