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
  voice: {
    start: "Start recording",
    stop: "Stop recording",
    listening: "Listening",
    thinking: "Thinking",
    nothingHeard: "Nothing was heard",
  },
  companion: {
    talk: "Tap to talk",
    talkTo: (name: string) => `Tap to talk to ${name}`,
    stop: "Tap to stop",
  },
  shortcuts: {
    title: "Shortcuts",
  },
  characters: {
    orb: "Glowing orb",
    face: "Face",
  },
  personalize: {
    open: "Personalize",
    title: "Make it yours",
    name: "Name",
    color: "Color",
    shape: "Shape",
    character: "Character",
    language: "Language",
    done: "Done",
    shapes: { circle: "Circle", blob: "Blob", ring: "Ring" },
    hues: {
      apricot: "Apricot",
      coral: "Coral",
      rose: "Rose",
      terracotta: "Terracotta",
      honey: "Honey",
      marigold: "Marigold",
    },
  },
  request: {
    unexpectedResponse: "Unexpected response from the server",
  },
  captions: {
    translationUnavailable: "Translation unavailable",
  },
  activity: {
    title: "Activity",
    request: (text: string) => `Request: ${text}`,
    state: (state: string) => `State: ${state}`,
    agent: (agent: string) => `Agent: ${agent}`,
    toolCall: (tool: string, status: string) => `Tool ${tool}: ${status}`,
    speech: (audioUrl: string) => `Speech: ${audioUrl}`,
    userCaption: (text: string, english: string) => `You said: ${text} · English: ${english}`,
    assistantCaption: (text: string, english: string) =>
      `Assistant said: ${text} · English: ${english}`,
  },
};
