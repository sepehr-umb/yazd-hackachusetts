import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Device } from "./deviceBridge";

export function nativeDevice(): Device | undefined {
  if (!Capacitor.isNativePlatform()) return undefined;
  return registerPlugin<Device>("YazdDevice");
}
