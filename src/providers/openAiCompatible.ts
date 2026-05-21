import { parseInsightResult } from "../shared/insightSchema";
import { buildInsightMessages } from "../shared/prompt";
import type { InsightInput, ModelProviderConfig, ParsedInsightResult } from "../shared/types";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

function endpointFor(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

export async function generateInsightWithProvider(
  input: InsightInput,
  config: ModelProviderConfig
): Promise<ParsedInsightResult> {
  const response = await fetch(endpointFor(config.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: buildInsightMessages(input)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.name} request failed with HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`${config.name} returned an empty model response.`);
  }

  return parseInsightResult(content);
}
