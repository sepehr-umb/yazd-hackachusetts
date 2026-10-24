import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { pcmToWav } from "./pcmToWav";

const HEADER_BYTES = 44;
const bytes = fc.uint8Array({ maxLength: 4096 }).map((data) => Buffer.from(data));

describe("pcmToWav", () => {
  it("wraps empty input in a bare 44-byte header", () => {
    const wav = pcmToWav(Buffer.alloc(0));

    expect(wav.length).toBe(HEADER_BYTES);
    expect(wav.readUInt32LE(4)).toBe(36);
    expect(wav.readUInt32LE(40)).toBe(0);
  });

  it("places four bytes of pcm after a header sized for them", () => {
    const wav = pcmToWav(Buffer.from([1, 2, 3, 4]));

    expect(wav.length).toBe(48);
    expect(wav.readUInt32LE(4)).toBe(40);
    expect(wav.readUInt32LE(40)).toBe(4);
    expect(wav.subarray(44)).toEqual(Buffer.from([1, 2, 3, 4]));
  });

  it("writes the RIFF, WAVE, fmt and data markers at their offsets", () => {
    const wav = pcmToWav(Buffer.from([1]));

    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.toString("ascii", 12, 16)).toBe("fmt ");
    expect(wav.toString("ascii", 36, 40)).toBe("data");
  });

  it("describes 16-bit mono pcm at 24000 Hz", () => {
    const wav = pcmToWav(Buffer.from([1]));

    expect(wav.readUInt32LE(16)).toBe(16);
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(28)).toBe(48000);
    expect(wav.readUInt16LE(32)).toBe(2);
    expect(wav.readUInt16LE(34)).toBe(16);
  });

  it("leaves the input buffer untouched", () => {
    const input = Buffer.from([9, 8, 7]);

    pcmToWav(input);

    expect(input).toEqual(Buffer.from([9, 8, 7]));
  });

  it("adds 44 bytes, sizes the header from the input and keeps the payload for any bytes", () => {
    fc.assert(
      fc.property(bytes, (pcm) => {
        const wav = pcmToWav(pcm);

        expect(wav.length).toBe(HEADER_BYTES + pcm.length);
        expect(wav.readUInt32LE(4)).toBe(36 + pcm.length);
        expect(wav.readUInt32LE(40)).toBe(pcm.length);
        expect(wav.subarray(HEADER_BYTES)).toEqual(pcm);
      }),
    );
  });

  it("builds the same header for any two inputs of equal length", () => {
    fc.assert(
      fc.property(bytes, (first) => {
        const second = Buffer.alloc(first.length, 255);

        expect(pcmToWav(first).subarray(0, HEADER_BYTES)).toEqual(
          pcmToWav(second).subarray(0, HEADER_BYTES),
        );
      }),
    );
  });
});
