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

const ERROR_BODY_MAX_LENGTH = 240;
const API_KEY_PATTERN = /\bsk-[A-Za-z0-9._-]+\b/g;

function endpointFor(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

async function readSanitizedErrorBody(response: Response): Promise<string> {
  let errorText: string;

  try {
    errorText = await response.text();
  } catch {
    errorText = "Unable to read provider error body.";
  }

  const redacted = errorText.replace(API_KEY_PATTERN, "[REDACTED]");

  if (redacted.length <= ERROR_BODY_MAX_LENGTH) {
    return redacted;
  }

  return `${redacted.slice(0, ERROR_BODY_MAX_LENGTH)}...`;
}

function shouldRetryWithoutResponseFormat(errorText: string): boolean {
  const lowerErrorText = errorText.toLowerCase();

  return (
    lowerErrorText.includes("response_format") ||
    lowerErrorText.includes("json_object") ||
    lowerErrorText.includes("unsupported parameter") ||
    lowerErrorText.includes("unknown parameter")
  );
}

async function requestChatCompletion(
  input: InsightInput,
  config: ModelProviderConfig,
  includeResponseFormat: boolean
): Promise<Response> {
  const body: Record<string, unknown> = {
    model: config.model,
    temperature: 0.2,
    messages: buildInsightMessages(input)
  };

  if (includeResponseFormat) {
    body.response_format = { type: "json_object" };
  }

  return fetch(endpointFor(config.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

async function parseSuccessfulResponse(
  response: Response,
  config: ModelProviderConfig
): Promise<ParsedInsightResult> {
  const data = (await response.json().catch(() => {
    throw new Error(`${config.name} returned malformed JSON.`);
  })) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(`${config.name} returned an empty model response.`);
  }

  return parseInsightResult(content);
}

export async function generateInsightWithProvider(
  input: InsightInput,
  config: ModelProviderConfig
): Promise<ParsedInsightResult> {
  let response = await requestChatCompletion(input, config, true);

  if (!response.ok) {
    let errorText = await readSanitizedErrorBody(response);

    if (shouldRetryWithoutResponseFormat(errorText)) {
      response = await requestChatCompletion(input, config, false);

      if (response.ok) {
        return parseSuccessfulResponse(response, config);
      }

      errorText = await readSanitizedErrorBody(response);
    }

    throw new Error(`${config.name} request failed with HTTP ${response.status}: ${errorText}`);
  }

  return parseSuccessfulResponse(response, config);
}
