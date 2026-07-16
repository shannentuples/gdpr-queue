import { anthropic, CLAUDE_MODEL } from "./anthropicClient.js";
import type { DsarRequest, FoundRecord } from "../types/dsar.js";

const SYSTEM_PROMPT = `You are a GDPR compliance assistant drafting formal response letters to data subject requests on behalf of a company's privacy team.

Write a complete, ready-to-send letter that:
- Addresses the requester by name
- References the specific GDPR article relevant to their request type (access: Art. 15, deletion: Art. 17, portability: Art. 20, correction: Art. 16)
- Summarizes what was found across the searched internal systems, grouped by system — or states nothing was found
- For access requests: describes the categories of personal data held
- For deletion requests: confirms what will be deleted and any retention exceptions to flag for legal review
- For portability requests: confirms the data will be exported in a portable format
- For correction requests: describes the correction being made
- States the statutory response deadline
- Uses a professional, plain-language tone — this letter goes directly to the data subject
- Ends with a line inviting the requester to contact the privacy team with questions

You will only be given CONFIRMED records — records a reviewer has verified actually belong to this requester. Only reference these. Do not fabricate data, and do not reference anything beyond what's provided. Output only the letter text, no preamble or markdown formatting.`;

export async function draftResponseLetter(request: DsarRequest, confirmedRecords: FoundRecord[]): Promise<string> {
  const findingsText =
    confirmedRecords.length === 0
      ? "No confirmed records were found in any searched system."
      : confirmedRecords
          .map((r) => {
            const payloadText =
              r.payload && typeof r.payload === "object"
                ? Object.entries(r.payload as Record<string, unknown>)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")
                : String(r.payload);
            return `- ${r.sourceName} (${r.recordType}): ${payloadText}`;
          })
          .join("\n");

  const userMessage = `Requester name: ${request.requesterName}
Requester email: ${request.requesterEmail}
Request type: ${request.requestType ?? "unclassified"}
Original request text: ${request.description}
Statutory deadline: ${new Date(request.deadlineAt).toDateString()}

Confirmed findings:
${findingsText}

Draft the response letter now.`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Letter draft response did not contain a text block");
  }
  return textBlock.text;
}
