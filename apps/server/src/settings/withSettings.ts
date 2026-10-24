import { isSettingName, isSettingValue } from "@mahmood/contracts";
import type { AssistantEvent, SettingName, ToolInputs, ToolResult } from "@mahmood/contracts";
import type { EventBus, Tool, ToolSet } from "../orchestrator";
import { validateToolInput } from "../orchestrator/validateToolInput";
import { describeAllowed, settingToolSchema } from "./settingToolSchema";

function rejection(name: SettingName): ToolResult {
  const { allowed } = settingToolSchema(name);
  return {
    ok: true,
    output: { applied: false, error: `${name} must be ${describeAllowed(allowed)}`, allowed },
  };
}

function unknownSetting(name: unknown): ToolResult {
  return {
    ok: true,
    output: { applied: false, error: `Unknown setting "${String(name)}"` },
  };
}

function updating(tool: Tool<"update_setting">, bus: EventBus): Tool<"update_setting"> {
  return {
    name: tool.name,
    async execute(input: ToolInputs["update_setting"]): Promise<ToolResult> {
      const { name, value } = input;
      if (!isSettingName(name)) return unknownSetting(name);
      const { schema } = settingToolSchema(name);
      if (!validateToolInput(schema, { value }) || !isSettingValue(name, value)) {
        return rejection(name);
      }
      bus.emit({ type: "setting_changed", name, value } as AssistantEvent);
      return { ok: true, output: { applied: true, name, value } };
    },
  };
}

function resetting(tool: Tool<"reset_settings">, bus: EventBus): Tool<"reset_settings"> {
  return {
    name: tool.name,
    async execute(): Promise<ToolResult> {
      bus.emit({ type: "settings_reset" });
      return { ok: true, output: { applied: true } };
    },
  };
}

export function withSettings(tools: ToolSet, bus: EventBus): ToolSet {
  return {
    ...tools,
    update_setting: updating(tools.update_setting, bus),
    reset_settings: resetting(tools.reset_settings, bus),
  };
}
