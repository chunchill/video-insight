import type {
  InsightEvidence,
  InsightViewpoint,
  ParsedInsightResult,
  StructuredInsight
} from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asEvidenceArray(value: unknown): InsightEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
      text: asString(item.text)
    }))
    .filter((item) => item.text.length > 0);
}

function asViewpoints(value: unknown): InsightViewpoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      title: asString(item.title),
      detail: asString(item.detail),
      evidence: asEvidenceArray(item.evidence)
    }))
    .filter((item) => item.title.length > 0 || item.detail.length > 0);
}

export function parseInsightResult(rawText: string): ParsedInsightResult {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const data: StructuredInsight = {
      summary: asString(parsed.summary),
      takeaways: asStringArray(parsed.takeaways),
      viewpoints: asViewpoints(parsed.viewpoints),
      caveats: asStringArray(parsed.caveats),
      audience: asStringArray(parsed.audience)
    };

    return { kind: "structured", data, rawText };
  } catch {
    return {
      kind: "fallback",
      text: rawText.trim(),
      reason: "Model output was not valid JSON."
    };
  }
}
