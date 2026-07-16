import { anthropic, CLAUDE_MODEL } from "./anthropicClient.js";
import { REQUEST_TYPES, type RequestType } from "../types/dsar.js";

export interface ClassificationResult {
  requestType: RequestType;
  confidence: number;
  rationale: string;
}

// Below this, we don't trust the classifier's answer enough to auto-progress
// the request — a human reviewer decides the type instead. There's no
// numeric threshold in the sprint spec ("high/medium confidence auto-sets
// the type; low confidence flags for manual review"), so this is a product
// decision: 0.6 as the single cut line between "auto-progress" and "needs a
// human." Tune from real classifier behavior once there's usage data.
const CONFIDENCE_THRESHOLD = 0.6;

export interface ClassificationOutcome {
  requestType: RequestType | null;
  status: "classified" | "needs_review";
}

export function resolveClassificationOutcome(result: ClassificationResult): ClassificationOutcome {
  if (result.confidence >= CONFIDENCE_THRESHOLD) {
    return { requestType: result.requestType, status: "classified" };
  }
  return { requestType: null, status: "needs_review" };
}

const SYSTEM_PROMPT = `You are a GDPR compliance assistant. Classify incoming data subject requests into exactly one of these types:
- access: the person wants a copy of their personal data (Art. 15)
- deletion: the person wants their data deleted ("right to be forgotten", Art. 17)
- portability: the person wants their data exported in a portable format (Art. 20)
- correction: the person wants incorrect data corrected/rectified (Art. 16)

If the request doesn't clearly match one of these, pick the closest type and set confidence low — do not invent a category outside this list.

Base the classification only on the request text provided.`;

const CLASSIFICATION_SCHEMA = {
  type: "object",
  properties: {
    requestType: { type: "string", enum: REQUEST_TYPES as unknown as string[] },
    confidence: { type: "number", description: "0 to 1 confidence in this classification" },
    rationale: { type: "string", description: "One or two sentences explaining the classification" },
  },
  required: ["requestType", "confidence", "rationale"],
  additionalProperties: false,
} as const;

export async function classifyRequest(description: string): Promise<ClassificationResult> {
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: CLASSIFICATION_SCHEMA },
    },
    messages: [{ role: "user", content: description }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Classification response did not contain a text block");
  }

  return JSON.parse(textBlock.text) as ClassificationResult;
}
