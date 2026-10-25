import type { DeviceAction } from "@mahmood/contracts";
import type { AssistantEventSource } from "../events/assistantEventSource";

export type DeviceRequest = { action: DeviceAction; phone: string; text?: string };

export type Device = { perform(request: DeviceRequest): Promise<unknown> };

export type DeviceBridgeConfig = {
  events: AssistantEventSource;
  device: Device;
  onError?: (error: unknown) => void;
};

export function startDeviceBridge({
  events,
  device,
  onError = () => undefined,
}: DeviceBridgeConfig): () => void {
  return events.subscribe((event) => {
    if (event.type !== "device_action") return;
    const request: DeviceRequest =
      event.action === "whatsapp_message"
        ? { action: event.action, phone: event.phone, text: event.text }
        : { action: event.action, phone: event.phone };
    device.perform(request).catch(onError);
  });
}
