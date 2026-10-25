export const deviceActions = ["whatsapp_call", "phone_call", "whatsapp_message"] as const;

export const callMethods = ["whatsapp", "phone"] as const;

export type DeviceAction = (typeof deviceActions)[number];

export type CallMethod = (typeof callMethods)[number];

type DeviceTarget = { type: "device_action"; contact: string; phone: string };

export type DeviceActionEvent =
  | (DeviceTarget & { action: "whatsapp_call" | "phone_call" })
  | (DeviceTarget & { action: "whatsapp_message"; text: string });
