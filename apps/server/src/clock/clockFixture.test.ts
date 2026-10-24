import { describe, expect, it } from "vitest";
import { createTranscriptReplayLlmClient } from "../llm/transcriptReplayLlmClient";
import { replayConversations } from "../llm/replayConversations";
import { routeToolName } from "../orchestrator";
import type { LlmRequest } from "../orchestrator";

const clockTranscript = "ساعت چنده؟";

function routingRequest(transcript: string): LlmRequest {
  return {
    system: "",
    messages: [{ role: "user", content: transcript }],
    tools: [{ name: routeToolName, description: "", inputSchema: { type: "object", properties: {} } }],
  } as unknown as LlmRequest;
}

function clockConversation() {
  return replayConversations.find((conversation) => conversation.transcript === clockTranscript);
}

describe("clock recorded conversation", () => {
  const client = createTranscriptReplayLlmClient(replayConversations);

  it("is found for the exact clock transcript", async () => {
    const response = await client.complete(routingRequest(clockTranscript));

    expect(response.stopReason).toBe("tool_use");
  });

  it("still matches when the transcript is padded with whitespace", async () => {
    const response = await client.complete(routingRequest(`  ${clockTranscript}\n`));

    expect(response.stopReason).toBe("tool_use");
  });

  it("rejects a transcript that differs after trimming", async () => {
    await expect(client.complete(routingRequest("ساعت چنده"))).rejects.toThrow(
      'No recorded response for "ساعت چنده"',
    );
  });

  it("records route, get_time, then a non-empty final text", () => {
    const responses = clockConversation()?.responses ?? [];

    expect(responses).toHaveLength(3);
    expect(responses[0]?.content).toMatchObject([
      { type: "tool_use", name: "route_to_agent", input: { agent: "clock" } },
    ]);
    expect(responses[1]?.content).toMatchObject([{ type: "tool_use", name: "get_time", input: {} }]);
    expect(responses[2]?.stopReason).toBe("end_turn");
    expect(responses[2]?.content).toMatchObject([{ type: "text", text: expect.stringMatching(/\S/) }]);
  });
});
