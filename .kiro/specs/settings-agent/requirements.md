# Requirements Document

## Introduction

The Settings agent lets the user change how yazd behaves by speaking, in any language. A new Settings sub-agent handles requests about the app's own behavior: speech rate, caption size, contrast, and silence wait. Setting names, bounds, and defaults are defined once in a shared registry in the contracts package. Each change is validated on the server against that registry, published as an AssistantEvent, applied by the web Settings_Store to the affected surfaces, persisted in localStorage, and confirmed aloud in the language the user spoke. A reset request restores all defaults.

Speech rate is applied through an HTMLAudioElement with preservesPitch set to true, routed into the existing analyser so the face mouth animation keeps working. This avoids AudioBufferSourceNode.playbackRate, which changes pitch and distorts speech for an elderly listener. A new rate applies to the next clip only.

The server keeps no settings state. A relative request such as "slower" is therefore resolved by the Settings_Agent to an absolute Setting_Value.

Recorded replay fixtures for two Farsi demo requests let the app demonstrate settings with no OPENROUTER_API_KEY.

Out of scope: confirm-before-calling, server-side settings, accounts, cross-device sync, and changing the speech rate of audio that is already playing.

## Glossary

- **Settings_Agent**: The server sub-agent named "settings" that handles requests about yazd's own behavior.
- **Orchestrator**: The server component that routes a user request to a sub-agent.
- **Router**: The Orchestrator component that enumerates sub-agents and selects one for a request.
- **Setting**: One user-adjustable behavior from the fixed menu: speechRate, captionSize, highContrast, or silenceWaitMs.
- **Setting_Name**: The identifier of a Setting.
- **Setting_Value**: A value proposed for a Setting.
- **Setting_Schemas**: The single registry in the Contracts_Package that defines, for each Setting, its Setting_Name, type, bounds or allowed values, and default.
- **isSettingName**: The guard exported by the Contracts_Package that returns true only for a Setting_Name present in Setting_Schemas.
- **isSettingValue**: The guard exported by the Contracts_Package that returns true only when a Setting_Value has the type and lies within the bounds or allowed values that Setting_Schemas defines for a given Setting_Name.
- **Defaults**: The default values defined in Setting_Schemas: speechRate 1.0, captionSize large, highContrast on, silenceWaitMs 1500.
- **Update_Setting_Tool**: The tool update_setting(name, value) that changes one Setting.
- **Reset_Settings_Tool**: The tool reset_settings() that restores all Defaults and takes no meaningful input.
- **Settings_Tool_Wrapper**: A function in apps/server/src/settings that wraps a ToolSet and replaces the settings tools, following the withContactResolution pattern in apps/server/src/contacts.
- **Tool_Input_Validator**: The existing validateToolInput function that checks tool input against a schema supporting type, enum, minimum, and maximum.
- **Setting_Changed_Event**: The AssistantEvent of type "setting_changed" carrying a Setting_Name and a Setting_Value.
- **Settings_Reset_Event**: The AssistantEvent of type "settings_reset".
- **Event_Guard**: The type guard that decides whether an unknown value is a valid AssistantEvent.
- **Contracts_Package**: The packages/contracts package that defines Setting_Schemas, agentNames, AssistantEvent, toolNames, and ToolInputs.
- **Strings_Package**: The packages/strings package that holds all user-facing strings.
- **Settings_Store**: The web store in apps/web that holds current Setting values and applies events to surfaces.
- **Analyser**: The existing web audio analyser that drives the face mouth animation.
- **Speech_Player**: The web component that plays synthesized speech through an HTMLAudioElement with preservesPitch set to true, routed into the Analyser through a MediaElementAudioSourceNode. The speechRate Setting is applied as the element's playbackRate. AudioBufferSourceNode.playbackRate is not used because it changes pitch and distorts speech for an elderly listener.
- **Captions_Surface**: The web surface that displays captions.
- **Voice_Surface**: The web surface that captures speech and detects silence.
- **Activity_Describer**: The web describeEvent function that maps every AssistantEvent to an activity string.
- **Local_Storage**: The browser localStorage used to persist Setting values.
- **Caption_Size**: One of small, medium, large, or extra-large.
- **Settings_State**: The complete set of four current Setting values.
- **Replay_Conversations**: The recorded conversations in apps/server/src/llm/replayConversations.ts used by selectLlmClient when no OPENROUTER_API_KEY is set.
- **Replay_Fixture**: A recorded conversation for one demo request, including its transcript, routing, tool calls, and final spoken reply.
- **Web_Surface_Area**: The code in apps/web for voice, captions, and speech, which structure.md assigns to Teammate 1.

## Requirements

### Requirement 1: Settings menu, bounds, and single source of truth

**User Story:** As a user, I want a fixed menu of bounded settings, so that no spoken request can leave yazd unusable.

#### Acceptance Criteria

1. THE Contracts_Package SHALL define Setting_Schemas as the single source of truth for exactly four Settings: speechRate (number from 0.5 to 1.5 inclusive), captionSize (Caption_Size, one of small, medium, large, or extra-large), highContrast (boolean), and silenceWaitMs (integer from 800 to 4000 inclusive, in milliseconds).
2. THE Contracts_Package SHALL define the Defaults in Setting_Schemas as speechRate 1.0, captionSize large, highContrast true, and silenceWaitMs 1500, each of which lies within the bounds in criterion 1.
3. THE Contracts_Package SHALL export isSettingName and isSettingValue, both derived from Setting_Schemas.
4. THE server and THE web app SHALL read Setting names, bounds, and Defaults only from Setting_Schemas, including the update_setting schema, the Settings_Tool_Wrapper, the Settings_Store, and persistence loading, and SHALL NOT duplicate Setting names, bounds, or Defaults.
5. WHEN a Setting is added, THE Contracts_Package SHALL require exactly one new Setting_Schemas entry for that Setting, with no other file defining its name, bounds, or default.
6. THE Contracts_Package SHALL include "settings" in agentNames, so that the existing agentNames members (orchestrator, comms, home, media, clarifier) remain present and unchanged.
7. THE Contracts_Package SHALL include update_setting and reset_settings in toolNames, so that every existing toolNames member remains present and unchanged.
8. THE Contracts_Package SHALL define a ToolInputs entry for update_setting containing a Setting_Name and a Setting_Value, and a ToolInputs entry for reset_settings that takes no meaningful input.
9. IF a Setting_Value falls outside the bounds in criterion 1, is of the wrong type for its Setting_Name, or is paired with a name that is not one of the four Setting_Names, THEN isSettingValue or isSettingName SHALL classify the update_setting input as invalid, so that the caller can reject it and leave the current Settings_State unchanged.

### Requirement 2: Settings routing

**User Story:** As a user, I want requests about yazd's own behavior to reach the Settings agent, so that I can change settings in my own words.

#### Acceptance Criteria

1. WHEN the Orchestrator starts, THE Orchestrator SHALL register the Settings_Agent in the same sub-agent registry as the comms, home, media, and clarifier sub-agents, so that all five sub-agents are available for routing.
2. WHEN a user request asks to change speech rate, caption size, contrast, or silence wait, THE Router SHALL route the request to the Settings_Agent and to no other sub-agent.
3. WHEN a user request asks to restore normal behavior, THE Router SHALL route the request to the Settings_Agent and to no other sub-agent.
4. THE Router SHALL include the Settings_Agent, with a description of its purpose, in the list of sub-agents presented for selection on every routing decision.
5. WHEN a user request is spoken in any language supported by the speech recognizer, THE Router SHALL route a settings-related request to the Settings_Agent, and THE Settings_Agent SHALL interpret the request in the language it was spoken in.
6. IF a user request matches both a settings intent and a non-settings intent (comms, home, or media), THEN THE Router SHALL route the request to the clarifier sub-agent instead of the Settings_Agent, and SHALL leave all settings values unchanged.
7. IF the Router cannot determine whether a request concerns yazd's own settings, THEN THE Router SHALL route the request to the clarifier sub-agent, and SHALL leave all settings values unchanged.

### Requirement 3: Update a setting

**User Story:** As a user, I want to change one setting by voice, so that yazd fits my needs.

#### Acceptance Criteria

1. WHEN the Settings_Agent calls the Update_Setting_Tool with a Setting_Name for which isSettingName returns true and a Setting_Value for which isSettingValue returns true, THE Update_Setting_Tool SHALL publish exactly one Setting_Changed_Event carrying that Setting_Name and Setting_Value and SHALL return a success result to the Settings_Agent.
2. WHEN the Update_Setting_Tool receives a call, THE Tool_Input_Validator SHALL validate the input against the schema derived from Setting_Schemas for the named Setting before any Setting_Changed_Event is published.
3. IF the Update_Setting_Tool receives a Setting_Name for which isSettingName returns false, THEN THE Update_Setting_Tool SHALL return a validation error naming the unknown Setting_Name, SHALL publish no Setting_Changed_Event, and SHALL leave all Setting values unchanged.
4. IF the Update_Setting_Tool receives a numeric Setting_Value below the minimum or above the maximum that Setting_Schemas defines for the Setting, THEN THE Update_Setting_Tool SHALL return a validation error stating the minimum and maximum allowed values, SHALL publish no Setting_Changed_Event, and SHALL leave the Setting value unchanged.
5. IF the Update_Setting_Tool receives a Setting_Value whose type differs from the type that Setting_Schemas defines for the Setting, or a value not in the Setting's allowed enum, THEN THE Update_Setting_Tool SHALL return a validation error stating the expected type or listing the allowed enum values, SHALL publish no Setting_Changed_Event, and SHALL leave the Setting value unchanged.
6. IF the Update_Setting_Tool returns a validation error, THEN THE Settings_Agent SHALL speak one short sentence, in the language the user spoke, explaining that the change was not applied and stating the allowed range or the allowed choices for the Setting.

### Requirement 4: Reset settings

**User Story:** As a user, I want to say "go back to normal", so that I can recover from any state.

#### Acceptance Criteria

1. WHEN the Settings_Agent calls the Reset_Settings_Tool, THE Reset_Settings_Tool SHALL publish exactly one Settings_Reset_Event and return a success result to the Settings_Agent.
2. WHEN the Settings_Store receives a Settings_Reset_Event, THE Settings_Store SHALL set every field of Settings_State to its corresponding value in the Defaults, regardless of the Settings_State prior to the event.
3. WHEN the Settings_Store receives a Settings_Reset_Event while Settings_State already equals the Defaults, THE Settings_Store SHALL leave Settings_State equal to the Defaults and SHALL NOT return an error.
4. WHEN the Reset_Settings_Tool receives an input containing any properties, THE Reset_Settings_Tool SHALL ignore those properties, publish exactly one Settings_Reset_Event, and return a success result.

### Requirement 5: Spoken confirmation

**User Story:** As a user with low vision, I want yazd to confirm each change aloud, so that I know it worked.

#### Acceptance Criteria

1. WHEN a Setting_Changed_Event is published, THE Settings_Agent SHALL speak one short sentence, in the language the user spoke, that names the changed Setting and states its new Setting_Value.
2. WHEN a Settings_Reset_Event is published, THE Settings_Agent SHALL speak one short sentence, in the language the user spoke, stating that all settings were restored to their Defaults.
3. IF the user request does not identify a Setting or a Setting_Value, THEN THE Settings_Agent SHALL speak exactly one question as one short sentence, in the language the user spoke, asking for the missing Setting or Setting_Value, SHALL call neither the Update_Setting_Tool nor the Reset_Settings_Tool, and SHALL leave Settings_State unchanged.
4. IF the Update_Setting_Tool or the Reset_Settings_Tool publishes no event, THEN THE Settings_Agent SHALL NOT speak a success confirmation.

### Requirement 6: Event contract

**User Story:** As a surface developer, I want typed settings events, so that surfaces can consume them safely.

#### Acceptance Criteria

1. THE Contracts_Package SHALL define Setting_Changed_Event with exactly one Setting_Name and exactly one Setting_Value, where Setting_Name is a member of the set of names defined in Setting_Schemas and Setting_Value has the type associated with that Setting_Name.
2. THE Contracts_Package SHALL define Settings_Reset_Event as an event that carries no Setting_Name and no Setting_Value.
3. WHEN the Event_Guard receives a candidate Setting_Changed_Event for which isSettingName returns true for its Setting_Name and isSettingValue returns true for its Setting_Value, THE Event_Guard SHALL accept the candidate.
4. WHEN the Event_Guard receives a candidate Settings_Reset_Event that has the correct event type discriminator and no Setting_Name or Setting_Value, THE Event_Guard SHALL accept the candidate.
5. IF a candidate Setting_Changed_Event has an unknown Setting_Name, a missing Setting_Value, or a Setting_Value of the wrong type for its Setting_Name, THEN THE Event_Guard SHALL reject the candidate, return a false result without throwing an exception, and leave the candidate unmodified.
6. IF the Event_Guard receives a candidate that is null, undefined, not an object, or has a missing or unrecognized event type discriminator, THEN THE Event_Guard SHALL reject the candidate, return a false result without throwing an exception, and leave the candidate unmodified.
7. FOR ALL valid Setting_Changed_Event and Settings_Reset_Event values, serializing to JSON then parsing then applying the Event_Guard SHALL accept the result and produce an event deeply equal to the original (round-trip property).
8. THE Contracts_Package SHALL include at least one passing test for each new type guard that covers acceptance of a valid event, and at least one rejection test for each rejection condition in criteria 5 and 6.

### Requirement 7: Settings store

**User Story:** As a user, I want settings to take effect immediately, so that I see and hear the change.

#### Acceptance Criteria

1. IF Local_Storage holds no saved state when the Settings_Store initializes, THEN THE Settings_Store SHALL set Settings_State to exactly the Defaults from Setting_Schemas.
2. WHEN the Settings_Store receives a Setting_Changed_Event for which isSettingName returns true for its Setting_Name and isSettingValue returns true for its Setting_Value, THE Settings_Store SHALL update that Setting to the received Setting_Value and leave the other three Settings unchanged.
3. IF the Settings_Store receives a Setting_Changed_Event for which isSettingName returns false or isSettingValue returns false (including a Setting_Value that is NaN, infinite, of the wrong type, out of bounds, or a captionSize outside the Caption_Size values), THEN THE Settings_Store SHALL leave Settings_State unchanged and SHALL notify no subscribed surface.
4. WHEN Settings_State changes, THE Settings_Store SHALL notify each subscribed surface exactly once per change within the same event-loop turn as the event that caused the change, with the notification carrying the new Settings_State.
5. THE Settings_Store SHALL keep every Setting within its Setting_Schemas bounds after every update, for any sequence of valid and invalid Setting_Changed_Events.
6. IF Local_Storage holds saved state that cannot be parsed, or holds a Setting_Value for which isSettingValue returns false, THEN THE Settings_Store SHALL set each affected Setting to its Default and keep every valid saved Setting as saved.
7. IF Local_Storage is unavailable or throws an error when the Settings_Store reads from it, THEN THE Settings_Store SHALL set Settings_State to exactly the Defaults and continue to accept Setting_Changed_Events.

### Requirement 8: Persistence

**User Story:** As a user, I want my settings to survive a restart, so that I do not repeat myself.

#### Acceptance Criteria

1. WHEN Settings_State changes, THE Settings_Store SHALL immediately write the complete Settings_State to Local_Storage, inside a try/catch.
2. WHEN the Settings_Store starts, THE Settings_Store SHALL read Settings_State from Local_Storage inside a try/catch before any Setting value is exposed to a consumer.
3. IF reading Local_Storage throws, THEN THE Settings_Store SHALL use the Defaults for all Settings, start without surfacing an error to the user, and leave any stored value unmodified.
4. IF the saved value is absent, empty, or not valid JSON, THEN THE Settings_Store SHALL use the Defaults for all Settings and start without surfacing an error to the user.
5. IF the saved value is valid JSON but is not an object (for example an array, number, string, boolean, or null), THEN THE Settings_Store SHALL use the Defaults for all Settings.
6. IF a saved Setting is missing or isSettingValue returns false for its value, THEN THE Settings_Store SHALL use the Default from Setting_Schemas for that Setting and keep every other valid saved Setting.
7. IF writing Local_Storage throws (for example because storage is full or unavailable), THEN THE Settings_Store SHALL keep the current in-memory Settings_State, continue operation, and retry the write on the next Settings_State change.
8. FOR ALL valid Settings_State values, writing then reading Local_Storage SHALL produce a Settings_State equal to the original in every Setting (round-trip property).

### Requirement 9: Surface application

**User Story:** As a user, I want each setting to change the right part of yazd, so that I notice the effect at once.

#### Acceptance Criteria

1. WHEN speechRate changes, THE Speech_Player SHALL immediately store the new value and apply it as the HTMLAudioElement playbackRate, with preservesPitch set to true, for the next clip that starts playing, and audio already playing SHALL continue at its previous rate.
2. WHEN captionSize changes, THE Captions_Surface SHALL immediately render both the captions currently displayed and all later captions at the new Caption_Size.
3. WHEN highContrast changes, THE Captions_Surface SHALL immediately render both the captions currently displayed and all later captions with the new contrast mode.
4. WHEN silenceWaitMs changes, THE Voice_Surface SHALL use the new value as its silence detection timeout for the next utterance that begins after the change.
5. WHILE the Voice_Surface is capturing an utterance, WHEN silenceWaitMs changes, THE Voice_Surface SHALL continue to use the previous silence detection timeout until that utterance ends.
6. WHEN the Settings_Store receives a Settings_Reset_Event, THE Speech_Player, THE Captions_Surface, and THE Voice_Surface SHALL each immediately apply the Defaults for the settings they consume, with the Speech_Player applying the default rate to the next clip.
7. WHEN the Settings_Store starts, THE Speech_Player, THE Captions_Surface, and THE Voice_Surface SHALL each apply the loaded Settings_State for the settings they consume before the first audio playback, caption render, or utterance capture begins.
8. IF the Settings_Store starts and no valid persisted Settings_State can be loaded, THEN THE Speech_Player, THE Captions_Surface, and THE Voice_Surface SHALL apply the Defaults.
9. THE Speech_Player SHALL route its HTMLAudioElement into the Analyser through a MediaElementAudioSourceNode, so that the face mouth animation continues to follow spoken audio.

### Requirement 10: Activity description

**User Story:** As a sighted helper, I want the activity panel to describe settings changes, so that I can follow what yazd did.

#### Acceptance Criteria

1. WHEN a Setting_Changed_Event is received, THE Activity_Describer SHALL return a single non-empty activity string that contains both the Setting_Name and the Setting_Value.
2. WHEN a Settings_Reset_Event is received, THE Activity_Describer SHALL return a single non-empty activity string that states that settings were reset.

### Requirement 11: User-facing strings

**User Story:** As a maintainer, I want all new strings in one package, so that text is easy to review and translate.

#### Acceptance Criteria

1. THE Strings_Package SHALL hold every new user-facing string introduced by this feature, including activity strings and Setting display names.
2. THE Settings_Agent, THE Settings_Store, and THE Activity_Describer SHALL read user-facing strings from the Strings_Package.
3. THE Strings_Package SHALL provide exactly one string value for each string key, and each string key SHALL be unique within the Strings_Package.
4. THE Settings_Agent, THE Settings_Store, and THE Activity_Describer SHALL contain zero user-facing string literals outside THE Strings_Package, excluding strings that are not displayed to the user.

### Requirement 12: Property-based testing

**User Story:** As a maintainer, I want property-based tests, so that edge cases in settings logic are caught.

#### Acceptance Criteria

1. THE project SHALL list fast-check as a devDependency pinned to an exact version (no ^, ~, or range operators) in the root package.json, for use by property-based tests.
2. THE settings test suite SHALL include a fast-check property that, for any generated sequence of 0 to 50 Setting_Changed_Events mixing in-bounds values, out-of-bounds values, and unknown Setting_Names, leaves every Setting within its Setting_Schemas bounds after each event is applied.
3. THE settings test suite SHALL include a fast-check property that, for any generated valid Settings_State, applying a Settings_Reset_Event sets Settings_State to exactly the Defaults.
4. THE settings test suite SHALL include a fast-check property that, for any generated valid Settings_State and any generated Setting_Changed_Event with an unknown Setting_Name or an out-of-bounds Setting_Value (including NaN, Infinity, and wrong-typed values), leaves Settings_State deeply equal to its prior value.
5. THE settings test suite SHALL include a fast-check property that, for any generated valid Settings_State, writing it to Local_Storage then reading it back yields a Settings_State deeply equal to the original.
6. THE settings test suite SHALL run each fast-check property with at least 100 generated cases.
7. IF a fast-check property fails, THEN THE settings test suite SHALL report the test as failed and output the seed and the shrunk counterexample.

### Requirement 13: Development process and conventions

**User Story:** As a maintainer, I want the feature built to project conventions, so that it stays consistent with the codebase.

#### Acceptance Criteria

1. THE implementation SHALL conform to every rule stated in .kiro/steering/product.md, .kiro/steering/tech.md, .kiro/steering/structure.md, and CLAUDE.md, such that zero rules in those files are violated by the changed files.
2. WHEN a new behavior is added, THE implementation SHALL include a test for that behavior that is run and recorded as failing before the production code making it pass is written, and recorded as passing after.
3. THE implementation SHALL contain zero code comments in every new or modified source and test file.
4. THE tests SHALL use mocks, stubs, or fakes only for boundaries external to the system, namely the LLM provider, network calls, and the system clock, and SHALL use real implementations for all internal modules.
5. THE implementation SHALL place the Settings_Tool_Wrapper in apps/server/src/settings, following the withContactResolution pattern in apps/server/src/contacts; the Settings_Agent definition, the settings tool schemas, and the stub tool registration in apps/server/src/orchestrator; shared types and Setting_Schemas in packages/contracts; user-facing strings in packages/strings; and the Settings_Store in apps/web, with zero such files located in any other package or directory.
6. IF a changed file violates criterion 3 or criterion 5, THEN THE implementation SHALL be treated as non-conforming and SHALL NOT be considered complete until the violation is removed.

### Requirement 14: Known limitation: no server-side settings state

**User Story:** As a maintainer, I want the lack of server-side settings state documented, so that the Settings agent behaves predictably for relative requests.

#### Acceptance Criteria

1. THE server SHALL keep no settings state, and SHALL NOT read or store Settings_State.
2. WHEN a user makes a relative request such as "slower", THE Settings_Agent SHALL resolve the request to an absolute Setting_Value that satisfies isSettingValue, and SHALL NOT use a relative step.
3. THE Settings_Agent prompt SHALL NOT assume that the current Setting_Value is known.
4. THE requirements document SHALL record this limitation, so that a reader can see why relative requests are resolved to absolute values.

### Requirement 15: Recorded replay fixtures

**User Story:** As a presenter, I want recorded Farsi settings conversations, so that I can demonstrate the Settings agent with no OPENROUTER_API_KEY.

#### Acceptance Criteria

1. THE Replay_Conversations SHALL include a Replay_Fixture for the Farsi request "speak slower", with its transcript written in Farsi script.
2. THE Replay_Conversations SHALL include a Replay_Fixture for the Farsi request "go back to normal", with its transcript written in Farsi script.
3. WHEN the "speak slower" Replay_Fixture is replayed, THE Orchestrator SHALL route the request to the Settings_Agent, the Settings_Agent SHALL call the Update_Setting_Tool with speechRate and an absolute Setting_Value below 1.0, and the Settings_Agent SHALL end with a one-sentence confirmation in Farsi.
4. WHEN the "go back to normal" Replay_Fixture is replayed, THE Orchestrator SHALL route the request to the Settings_Agent, the Settings_Agent SHALL call the Reset_Settings_Tool, and the Settings_Agent SHALL end with a one-sentence confirmation in Farsi.
5. WHEN no OPENROUTER_API_KEY is set, THE selectLlmClient function SHALL select a replay client that serves both Replay_Fixtures from the Replay_Conversations.
6. THE settings test suite SHALL replay each Replay_Fixture with the real Orchestrator and assert the emitted Setting_Changed_Event for the "speak slower" fixture and the emitted Settings_Reset_Event for the "go back to normal" fixture.

### Requirement 16: Team ownership of web surfaces

**User Story:** As Teammate 1, I want changes in my web areas kept minimal and listed, so that I can review them and avoid merge conflicts.

#### Acceptance Criteria

1. WHERE a change touches the Web_Surface_Area, THE implementation SHALL limit that change to wiring the Settings_Store into the Speech_Player, the Captions_Surface, and the Voice_Surface.
2. THE implementation SHALL leave all other behavior in the Web_Surface_Area unchanged.
3. WHEN the implementation is complete, THE final implementation summary SHALL list every touched file in the Web_Surface_Area.
