const SAMPLE_RATE = 24000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const BLOCK_ALIGN = CHANNELS * BYTES_PER_SAMPLE;
const BYTE_RATE = SAMPLE_RATE * BLOCK_ALIGN;
const HEADER_BYTES = 44;
const PCM_FORMAT_CODE = 1;
const FMT_CHUNK_SIZE = 16;

export function pcmToWav(pcm: Buffer): Buffer {
  const wav = Buffer.alloc(HEADER_BYTES + pcm.length);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(HEADER_BYTES - 8 + pcm.length, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(FMT_CHUNK_SIZE, 16);
  wav.writeUInt16LE(PCM_FORMAT_CODE, 20);
  wav.writeUInt16LE(CHANNELS, 22);
  wav.writeUInt32LE(SAMPLE_RATE, 24);
  wav.writeUInt32LE(BYTE_RATE, 28);
  wav.writeUInt16LE(BLOCK_ALIGN, 32);
  wav.writeUInt16LE(BITS_PER_SAMPLE, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, HEADER_BYTES);
  return wav;
}
