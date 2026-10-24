import { describe, expect, it } from "vitest";
import type { Profile } from "../profile/profile";
import { createTestContext } from "../testing/testContext";
import { mountForProfile } from "./mountForProfile";
import type { Settings, Surface } from "./surface";

function labelled(id: string, log: string[]): Surface {
  return {
    id,
    mount() {
      log.push(`mount ${id}`);
      return () => log.push(`unmount ${id}`);
    },
  };
}

const settingsFor = ({ vision }: Profile): Settings => ({
  surfaces: vision === "minimal" ? { big: true } : { small: true },
});

function mounted() {
  const log: string[] = [];
  const context = createTestContext();
  const root = document.createElement("div");
  const unmount = mountForProfile({
    registry: [labelled("big", log), labelled("small", log)],
    settingsFor,
    root,
    context,
  });
  return { log, context, root, unmount };
}

describe("mountForProfile", () => {
  it("mounts the surfaces the profile calls for", () => {
    expect(mounted().log).toEqual(["mount small"]);
  });

  it("remounts with the new surfaces when the vision level changes", () => {
    const { log, context } = mounted();

    context.profile.update({ vision: "minimal" });

    expect(log).toEqual(["mount small", "unmount small", "mount big"]);
  });

  it("remounts when only the vision level changes, so surfaces read it fresh", () => {
    const { log, context } = mounted();

    context.profile.update({ vision: "full" });
    context.profile.update({ vision: "low" });

    expect(log).toEqual([
      "mount small",
      "unmount small",
      "mount small",
      "unmount small",
      "mount small",
    ]);
  });

  it("leaves surfaces mounted for changes that do not affect the layout", () => {
    const { log, context } = mounted();

    context.profile.update({ hue: 12, language: "it" });

    expect(log).toEqual(["mount small"]);
  });

  it("stops following the profile and unmounts everything when unmounted", () => {
    const { log, context, unmount } = mounted();

    unmount();
    context.profile.update({ vision: "minimal" });

    expect(log).toEqual(["mount small", "unmount small"]);
  });
});
