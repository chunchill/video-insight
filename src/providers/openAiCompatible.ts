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

interface ChatCompletionStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
}

const ERROR_BODY_MAX_LENGTH = 240;
const API_KEY_PATTERN = /\bsk-[A-Za-z0-9._-]+\b/g;
export type InsightStreamDeltaHandler = (delta: string, fullText: string) => void;

interface SanitizedErrorBody {
  fullText: string;
  displayText: string;
}

class StreamingTransportError extends Error {}

function endpointFor(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

function truncateErrorBody(errorText: string): string {
  if (errorText.length <= ERROR_BODY_MAX_LENGTH) {
    return errorText;
  }

  return `${errorText.slice(0, ERROR_BODY_MAX_LENGTH)}...`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactErrorBody(errorText: string, apiKey: string): string {
  const redactedGenericKeys = errorText.replace(API_KEY_PATTERN, "[REDACTED]");

  if (apiKey.length === 0) {
    return redactedGenericKeys;
  }

  return redactedGenericKeys.replace(new RegExp(escapeRegExp(apiKey), "g"), "[REDACTED]");
}

async function readSanitizedErrorBody(response: Response, apiKey: string): Promise<SanitizedErrorBody> {
  let errorText: string;

  try {
    errorText = await response.text();
  } catch {
    errorText = "Unable to read provider error body.";
  }

  const redacted = redactErrorBody(errorText, apiKey);

  return {
    fullText: redacted,
    displayText: truncateErrorBody(redacted)
  };
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
  includeResponseFormat: boolean,
  stream = false
): Promise<Response> {
  const body: Record<string, unknown> = {
    model: config.model,
    temperature: 0.2,
    messages: buildInsightMessages(input),
    ...(stream ? { stream: true } : {})
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

function isTransportObject(value: unknown): value is ChatCompletionResponse {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStreamChunk(value: unknown): value is ChatCompletionStreamChunk {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shouldFallbackToNonStreaming(errorText: string): boolean {
  const lowerErrorText = errorText.toLowerCase();

  return lowerErrorText.includes("stream") || lowerErrorText.includes("streaming");
}

async function parseSuccessfulResponse(
  response: Response,
  config: ModelProviderConfig
): Promise<ParsedInsightResult> {
  const data = (await response.json().catch(() => {
    throw new Error(`${config.name} returned malformed JSON.`);
  })) as unknown;

  if (!isTransportObject(data)) {
    throw new Error(`${config.name} returned malformed JSON.`);
  }

  const content = data.choices?.[0]?.message?.content;

  if (content == null || content === "") {
    throw new Error(`${config.name} returned an empty model response.`);
  }

  if (typeof content !== "string") {
    throw new Error(`${config.name} returned malformed JSON.`);
  }

  return parseInsightResult(content);
}

async function parseSuccessfulStreamResponse(
  response: Response,
  config: ModelProviderConfig,
  onDelta: InsightStreamDeltaHandler
): Promise<ParsedInsightResult> {
  if (!response.body) {
    throw new StreamingTransportError(`${config.name} returned an empty streaming response.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bufferedText = "";
  let fullText = "";

  function consumeEvent(eventText: string) {
    const dataLines = eventText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    for (const dataLine of dataLines) {
      if (dataLine === "" || dataLine === "[DONE]") {
        continue;
      }

      const parsed: unknown = JSON.parse(dataLine);
      if (!isStreamChunk(parsed)) {
        throw new StreamingTransportError(`${config.name} returned malformed streaming JSON.`);
      }

      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta == null || delta === "") {
        continue;
      }

      if (typeof delta !== "string") {
        throw new StreamingTransportError(`${config.name} returned malformed streaming JSON.`);
      }

      fullText += delta;
      onDelta(delta, fullText);
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      bufferedText += decoder.decode(value, { stream: !done });

      const events = bufferedText.split(/\r?\n\r?\n/);
      bufferedText = events.pop() ?? "";

      for (const eventText of events) {
        consumeEvent(eventText);
      }

      if (done) {
        break;
      }
    }

    if (bufferedText.trim().length > 0) {
      consumeEvent(bufferedText);
    }
  } catch (streamError) {
    if (streamError instanceof SyntaxError) {
      throw new StreamingTransportError(`${config.name} returned malformed streaming JSON.`);
    }
    throw streamError;
  }

  if (fullText.length === 0) {
    throw new StreamingTransportError(`${config.name} returned an empty streaming response.`);
  }

  return parseInsightResult(fullText);
}

export async function generateInsightWithProvider(
  input: InsightInput,
  config: ModelProviderConfig
): Promise<ParsedInsightResult> {
  let response = await requestChatCompletion(input, config, true);

  if (!response.ok) {
    let errorBody = await readSanitizedErrorBody(response, config.apiKey);

    if (shouldRetryWithoutResponseFormat(errorBody.fullText)) {
      response = await requestChatCompletion(input, config, false);

      if (response.ok) {
        return parseSuccessfulResponse(response, config);
      }

      errorBody = await readSanitizedErrorBody(response, config.apiKey);
    }

    throw new Error(`${config.name} request failed with HTTP ${response.status}: ${errorBody.displayText}`);
  }

  return parseSuccessfulResponse(response, config);
}

export async function generateInsightStreamWithProvider(
  input: InsightInput,
  config: ModelProviderConfig,
  onDelta: InsightStreamDeltaHandler
): Promise<ParsedInsightResult> {
  async function parseStreamOrFallback(responseToParse: Response): Promise<ParsedInsightResult> {
    if (!responseToParse.body) {
      return generateInsightWithProvider(input, config);
    }

    try {
      return await parseSuccessfulStreamResponse(responseToParse, config, onDelta);
    } catch (streamError) {
      if (streamError instanceof StreamingTransportError) {
        return generateInsightWithProvider(input, config);
      }

      throw streamError;
    }
  }

  let response = await requestChatCompletion(input, config, true, true);

  if (!response.ok) {
    let errorBody = await readSanitizedErrorBody(response, config.apiKey);

    if (shouldFallbackToNonStreaming(errorBody.fullText)) {
      return generateInsightWithProvider(input, config);
    }

    if (shouldRetryWithoutResponseFormat(errorBody.fullText)) {
      response = await requestChatCompletion(input, config, false, true);

      if (response.ok) {
        return parseStreamOrFallback(response);
      }

      errorBody = await readSanitizedErrorBody(response, config.apiKey);
      if (shouldFallbackToNonStreaming(errorBody.fullText)) {
        return generateInsightWithProvider(input, config);
      }
    }

    throw new Error(`${config.name} request failed with HTTP ${response.status}: ${errorBody.displayText}`);
  }

  return parseStreamOrFallback(response);
}
