import { describe, expect, it } from "vitest";
import { parseInsightResult } from "../src/shared/insightSchema";

describe("parseInsightResult", () => {
  it("parses valid structured insight JSON", () => {
    const result = parseInsightResult(
      JSON.stringify({
        summary: "AI changes workflows.",
        takeaways: ["Context matters", "Review remains important"],
        viewpoints: [
          {
            title: "Workflow change",
            detail: "The video argues complete workflows matter more than isolated tasks.",
            evidence: [{ timestamp: "03:12", text: "Workflow example" }]
          }
        ],
        caveats: ["Transcript may omit visual context"],
        audience: ["AI product builders"]
      })
    );

    expect(result.kind).toBe("structured");
    if (result.kind === "structured") {
      expect(result.data.summary).toBe("AI changes workflows.");
      expect(result.data.takeaways).toHaveLength(2);
      expect(result.data.viewpoints[0].evidence[0].timestamp).toBe("03:12");
    }
  });

  it("returns readable fallback for non-json model output", () => {
    const result = parseInsightResult("This video says AI changes workflows.");

    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") {
      expect(result.text).toContain("AI changes workflows");
      expect(result.reason).toBe("Model output was not valid JSON.");
    }
  });

  it("returns schema fallback for valid JSON with invalid top-level shape", () => {
    const invalidOutputs = ["[]", "null", "\"text\""];

    for (const output of invalidOutputs) {
      const result = parseInsightResult(output);

      expect(result.kind).toBe("fallback");
      if (result.kind === "fallback") {
        expect(result.reason).toBe("Model output JSON did not match the expected insight schema.");
      }
    }
  });

  it("returns schema fallback when summary is not a string", () => {
    const result = parseInsightResult(JSON.stringify({ summary: 123 }));

    expect(result.kind).toBe("fallback");
    if (result.kind === "fallback") {
      expect(result.reason).toBe("Model output JSON did not match the expected insight schema.");
    }
  });

  it("normalizes missing arrays to empty arrays", () => {
    const result = parseInsightResult(JSON.stringify({ summary: "Short result" }));

    expect(result.kind).toBe("structured");
    if (result.kind === "structured") {
      expect(result.data.takeaways).toEqual([]);
      expect(result.data.viewpoints).toEqual([]);
      expect(result.data.caveats).toEqual([]);
      expect(result.data.audience).toEqual([]);
    }
  });
});
