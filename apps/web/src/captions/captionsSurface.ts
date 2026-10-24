import type { CaptionSpeaker, Settings } from "@mahmood/contracts";
import type { Surface } from "../surfaces/surface";

function createBlock(document: Document, speaker: CaptionSpeaker) {
  const block = document.createElement("div");
  block.dataset.speaker = speaker;
  const original = document.createElement("p");
  original.dataset.role = "original";
  original.dir = "auto";
  const english = document.createElement("p");
  english.dataset.role = "english";
  english.dir = "ltr";
  block.append(original, english);
  return { block, original, english };
}

export const captionsSurface: Surface = {
  id: "captions",
  mount(host, context) {
    const document = host.ownerDocument;
    const blocks = new Map<CaptionSpeaker, ReturnType<typeof createBlock>>();

    const applySettings = ({ captionSize, highContrast }: Settings) => {
      host.dataset.captionSize = captionSize;
      host.dataset.contrast = highContrast ? "high" : "normal";
    };
    applySettings(context.settings.get());
    const unsubscribeSettings = context.settings.subscribe(applySettings);

    const unsubscribe = context.events.subscribe((event) => {
      if (event.type !== "caption") return;
      let entry = blocks.get(event.speaker);
      if (!entry) {
        entry = createBlock(document, event.speaker);
        blocks.set(event.speaker, entry);
        host.append(entry.block);
      }
      entry.original.textContent = event.text;
      entry.english.textContent = event.english;
    });

    return () => {
      unsubscribe();
      unsubscribeSettings();
      delete host.dataset.captionSize;
      delete host.dataset.contrast;
      for (const { block } of blocks.values()) block.remove();
      blocks.clear();
    };
  },
};
