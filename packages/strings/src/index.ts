export const strings = {
  request: {
    unexpectedResponse: "Unexpected response from the server",
  },
  activity: {
    title: "Activity",
    empty: "Nothing yet",
    request: (text: string) => `Request: ${text}`,
    state: (state: string) => `State: ${state}`,
    agent: (agent: string) => `Agent: ${agent}`,
    toolCall: (tool: string, status: string) => `Tool ${tool}: ${status}`,
    speech: (audioUrl: string) => `Speech: ${audioUrl}`,
  },
};
