export const strings = {
  failure: {
    toolFailed: (tool: string, error: string) => `${tool} failed: ${error}`,
    invalidToolCall: (tool: string) => `The assistant asked for an action it cannot do: ${tool}`,
    tooManySteps: "The assistant took too many steps",
    unroutable: "The assistant does not know how to help with that",
    llmError: (message: string) => `The language model failed: ${message}`,
  },
  audio: {
    emptyRecording: "The recording was empty",
    nothingHeard: "Nothing was heard in the recording",
    transcriptionFailed: (message: string) => `The recording could not be transcribed: ${message}`,
  },
  textInput: {
    label: "Type a request",
    send: "Send",
  },
  request: {
    unexpectedResponse: "Unexpected response from the server",
  },
  activity: {
    title: "Activity",
    request: (text: string) => `Request: ${text}`,
    state: (state: string) => `State: ${state}`,
    agent: (agent: string) => `Agent: ${agent}`,
    toolCall: (tool: string, status: string) => `Tool ${tool}: ${status}`,
    speech: (audioUrl: string) => `Speech: ${audioUrl}`,
  },
};
