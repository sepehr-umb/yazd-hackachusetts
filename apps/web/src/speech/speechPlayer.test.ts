import { describe, expect, it } from "vitest";
import { defaultSettings } from "@mahmood/contracts";
import { setupSpeechPlayer as setup } from "./speechPlayerFixture";

describe("createSpeechPlayer", () => {
  it("has no audio frame before anything is spoken", () => {
    expect(setup().player.frame()).toBeNull();
  });

  it("creates one audio element and one source node wired to the analyser", async () => {
    const { emit, settle, audios, sourceNodes, analyser, destination } = setup();

    emit({ type: "speech", audioUrl: "/speech/one" });
    await settle();
    emit({ type: "speech", audioUrl: "/speech/two" });
    await settle();

    expect(audios).toHaveLength(1);
    expect(sourceNodes).toHaveLength(1);
    expect(sourceNodes[0]?.element).toBe(audios[0]);
    expect(sourceNodes[0]?.connectedTo).toEqual([analyser]);
    expect(analyser.connectedTo).toEqual([destination]);
    expect(audios[0]?.src).toBe("/speech/two");
    expect(audios[0]?.plays).toBe(2);
  });

  it("reports an audio frame while a clip plays and none once it ends", async () => {
    const { player, emit, settle, audios } = setup();
    emit({ type: "speech", audioUrl: "/speech/abc" });
    await settle();

    expect(player.frame()).toEqual({
      bins: new Uint8Array([10, 20, 30, 40]),
      hzPerBin: 48000 / 1024,
    });

    audios[0]?.onended?.();

    expect(player.frame()).toBeNull();
  });

  it("keeps pitch and uses the speech rate setting for each clip", async () => {
    const { emit, settle, audios } = setup();

    emit({ type: "speech", audioUrl: "/speech/one" });
    await settle();
    emit({ type: "setting_changed", name: "speechRate", value: 0.8 });
    expect(audios[0]?.playbackRate).toBe(defaultSettings.speechRate);
    emit({ type: "speech", audioUrl: "/speech/two" });
    await settle();

    expect(audios[0]?.preservesPitch).toBe(true);
    expect(audios[0]?.rateAtPlay).toEqual([defaultSettings.speechRate, 0.8]);
  });

  it("returns to the default rate for the next clip after a reset", async () => {
    const { emit, settle, audios } = setup();
    emit({ type: "setting_changed", name: "speechRate", value: 0.8 });
    emit({ type: "speech", audioUrl: "/speech/one" });
    await settle();
    emit({ type: "settings_reset" });
    expect(audios[0]?.playbackRate).toBe(0.8);
    emit({ type: "speech", audioUrl: "/speech/two" });
    await settle();

    expect(audios[0]?.rateAtPlay).toEqual([0.8, defaultSettings.speechRate]);
  });

  it("ignores events that are not speech", async () => {
    const { emit, settle, audios } = setup();

    emit({ type: "state", state: "thinking" });
    await settle();

    expect(audios[0]?.plays ?? 0).toBe(0);
  });

  it("stops listening when disposed", () => {
    const { player, listeners } = setup();
    const before = listeners.size;

    player.dispose();

    expect(listeners.size).toBe(before - 1);
  });
});
