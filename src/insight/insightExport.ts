import type { OutputLanguage, ParsedInsightResult, TranscriptPayload } from "../shared/types";

export interface InsightMarkdownInput {
  transcript: TranscriptPayload;
  result: ParsedInsightResult;
  outputLanguage: OutputLanguage;
}

function listItems(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

export function buildInsightMarkdown(input: InsightMarkdownInput): string {
  const { transcript, result, outputLanguage } = input;
  const title = transcript.videoMeta.title ?? "Video Insight";
  const lines = [
    `# ${title}`,
    "",
    `Source: ${transcript.videoMeta.url}`,
    transcript.videoMeta.channel ? `Channel: ${transcript.videoMeta.channel}` : undefined,
    transcript.videoMeta.duration ? `Duration: ${transcript.videoMeta.duration}` : undefined,
    `Output language: ${outputLanguage}`,
    ""
  ].filter((line): line is string => line !== undefined);

  if (result.kind === "structured") {
    lines.push("## Summary", "", result.data.summary, "");
    lines.push("## Key takeaways", "", listItems(result.data.takeaways), "");
    lines.push("## Viewpoints", "");
    if (result.data.viewpoints.length === 0) {
      lines.push("- None", "");
    } else {
      for (const viewpoint of result.data.viewpoints) {
        lines.push(`### ${viewpoint.title || "Viewpoint"}`, "", viewpoint.detail, "");
        if (viewpoint.evidence.length > 0) {
          lines.push("Evidence:");
          for (const evidence of viewpoint.evidence) {
            lines.push(`- ${evidence.timestamp ? `${evidence.timestamp}: ` : ""}${evidence.text}`);
          }
          lines.push("");
        }
      }
    }
    lines.push("## Caveats", "", listItems(result.data.caveats), "");
  } else {
    lines.push("## Model output", "", result.reason, "", result.text, "");
  }

  lines.push("## Transcript", "", transcript.plainText, "");
  return `${lines.join("\n")}\n`;
}

export function createSafeFilename(value: string | undefined, extension: string): string {
  const basename =
    value
      ?.trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "video-insight";

  return `${basename}.${extension}`;
}
