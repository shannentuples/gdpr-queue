import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, CLAUDE_MODEL } from "./anthropicClient.js";
import { scoreMatch, MATCH_CONFIRM_THRESHOLD } from "../utils/fuzzyMatch.js";
import {
  clearRequestMatches,
  getCatalogRecordsBySourceNames,
  insertMatch,
  listDataSourceNames,
  listRequestMatches,
} from "../db/foundRecordsRepo.js";
import type { DsarRequest, FoundRecord } from "../types/dsar.js";

const MAX_TOOL_ITERATIONS = 6;

function buildSearchTool(sourceNames: string[]): Anthropic.Tool {
  return {
    name: "search_data_sources",
    description:
      "Search internal data sources for personal-data records belonging to a specific person. Email is matched exactly; name is matched fuzzily (handles typos, nicknames, minor spelling variations). Returns every candidate match found, each with its own confidence score and reason — matches are not guaranteed correct and may need manual review.",
    input_schema: {
      type: "object",
      properties: {
        email: { type: "string", description: "The requester's email address." },
        name: { type: "string", description: "The requester's full name." },
        sources: {
          type: "array",
          items: { type: "string", enum: sourceNames },
          description: "Which data sources to search.",
        },
      },
      required: ["email", "name", "sources"],
    },
  };
}

function buildSystemPrompt(sourceNames: string[]): string {
  return `You are a GDPR data-discovery assistant helping a compliance reviewer find a requester's personal data across internal systems.

Available data sources: ${sourceNames.join(", ")}.

Call the search_data_sources tool with the requester's email and name, and every data source that could plausibly hold their personal data — for GDPR access/deletion/portability/correction requests that generally means searching all available sources, not just ones the request text happens to mention by name. You may call the tool more than once, but a single call listing all relevant sources is usually enough. Once you've searched, reply with a one-sentence summary and stop calling tools. Do not fabricate results — only report what the tool returns.`;
}

interface ToolMatchResult {
  dataSourceId: string;
  sourceName: string;
  subjectName: string;
  subjectEmail: string;
  recordType: string;
  payload: unknown;
  confidence: number;
  reason: string;
}

function runSearchTool(input: { email: string; name: string; sources: string[] }): ToolMatchResult[] {
  const catalogRecords = getCatalogRecordsBySourceNames(input.sources);
  const results: ToolMatchResult[] = [];
  for (const record of catalogRecords) {
    const score = scoreMatch(
      { subjectName: record.subject_name, subjectEmail: record.subject_email },
      { name: input.name, email: input.email }
    );
    if (!score) continue;
    results.push({
      dataSourceId: record.data_source_id,
      sourceName: record.source_name,
      subjectName: record.subject_name,
      subjectEmail: record.subject_email,
      recordType: record.record_type,
      payload: JSON.parse(record.payload),
      confidence: score.confidence,
      reason: score.reason,
    });
  }
  return results;
}

export async function searchDataSources(
  request: DsarRequest
): Promise<{ matches: FoundRecord[]; summary: string }> {
  const sourceNames = listDataSourceNames();
  const tool = buildSearchTool(sourceNames);
  const systemPrompt = buildSystemPrompt(sourceNames);

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Requester name: ${request.requesterName}\nRequester email: ${request.requesterEmail}\nRequest type: ${request.requestType ?? "unclassified"}\n\nFind this person's records.`,
    },
  ];

  // Keyed by a stable identity (source + subject email/name + record type)
  // rather than a DB row id, since the tool result doesn't carry the
  // catalog row's id — this just needs to dedupe if Claude searches the
  // same source twice.
  const collected = new Map<string, ToolMatchResult>();
  let finalText = "";

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [tool],
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      finalText = textBlock?.text ?? finalText;
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((toolUse) => {
      const input = toolUse.input as { email: string; name: string; sources: string[] };
      const matches = runSearchTool(input);
      for (const match of matches) {
        const key = `${match.sourceName}:${match.subjectEmail}:${match.recordType}:${JSON.stringify(match.payload)}`;
        collected.set(key, match);
      }
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify({ matchCount: matches.length, matches }),
      };
    });

    messages.push({ role: "user", content: toolResults });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      finalText = textBlock?.text ?? finalText;
      break;
    }
  }

  clearRequestMatches(request.id);
  for (const match of collected.values()) {
    insertMatch({
      requestId: request.id,
      dataSourceId: match.dataSourceId,
      subjectName: match.subjectName,
      subjectEmail: match.subjectEmail,
      recordType: match.recordType,
      payload: match.payload,
      matchConfidence: match.confidence,
      matchReason: match.reason,
      confirmed: match.confidence >= MATCH_CONFIRM_THRESHOLD,
    });
  }

  return { matches: listRequestMatches(request.id), summary: finalText || "Search complete." };
}
