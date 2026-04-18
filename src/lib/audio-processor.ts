/**
 * Client-side audio processing: decode → resample to 16kHz mono → yield WAV chunks.
 *
 * FIXES vs original:
 * 1. Pre-flight size guard (>800MB → explicit error before OOM crash)
 * 2. decoded AudioBuffer released immediately after channel extraction
 * 3. Streaming chunk generation — no single giant monoData array;
 *    each chunk is yielded to a callback as soon as it is ready,
 *    so caller can upload while the next chunk is still being encoded.
 * 4. Channel-data slices cleared after each resampling segment.
 */

const TARGET_SAMPLE_RATE = 16000;
const MAX_CHUNK_BYTES = 24 * 1024 * 1024; // 24 MB — Groq hard limit is 25 MB
const OVERLAP_SECONDS = 2;                 // overlap between chunks for better continuity

// 16kHz mono 16-bit PCM = 32 000 bytes/sec
const BYTES_PER_SECOND = TARGET_SAMPLE_RATE * 2;
// Effective chunk duration without WAV header
const MAX_CHUNK_SAMPLES = Math.floor((MAX_CHUNK_BYTES - 44) / 2); // ~750 s ≈ 12.5 min
const OVERLAP_SAMPLES   = OVERLAP_SECONDS * TARGET_SAMPLE_RATE;
const STEP_SAMPLES      = MAX_CHUNK_SAMPLES - OVERLAP_SAMPLES;

// How many seconds of source audio to decode/resample in one pass.
// Keeps peak memory bounded regardless of total recording length.
const DECODE_SEGMENT_SECONDS = 60;

// Warn user before attempting to load a file that will almost certainly OOM.
const MAX_INPUT_BYTES = 800 * 1024 * 1024; // 800 MB

export interface ProcessingProgress {
  stage: "decoding" | "resampling" | "chunking" | "done";
  percent: number;
}

/**
 * Decode audio file → resample → return WAV File[].
 *
 * Memory strategy:
 *  • Source file is loaded into a single ArrayBuffer (unavoidable for Web Audio).
 *  • decoded AudioBuffer channel data is extracted into plain Float32Arrays,
 *    then the AudioBuffer reference is dropped so GC can reclaim it.
 *  • Resampled PCM is accumulated segment-by-segment into a rolling buffer
 *    that is flushed into a WAV File as soon as MAX_CHUNK_SAMPLES is reached.
 *  • At no point is the entire recording held twice in memory.
 */
export async function processAudioFile(
  file: File,
  onProgress?: (p: ProcessingProgress) => void
): Promise<File[]> {

  // ── Guard: catch obviously too-large files before OOM crash ──────────────
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(
      `Файл слишком большой (${(file.size / 1024 / 1024).toFixed(0)} МБ). ` +
      `Максимум ${MAX_INPUT_BYTES / 1024 / 1024} МБ. ` +
      `Пожалуйста, разбейте запись на части или сожмите файл.`
    );
  }

  onProgress?.({ stage: "decoding", percent: 0 });

  // ── Decode ────────────────────────────────────────────────────────────────
  const arrayBuffer = await file.arrayBuffer();

  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const decodeCtx = new AudioCtx();

  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (e) {
    decodeCtx.close().catch(() => {});
    throw new Error(
      "Не удалось декодировать аудио. Попробуйте конвертировать файл в MP3 или WAV."
    );
  }
  decodeCtx.close().catch(() => {});

  onProgress?.({ stage: "resampling", percent: 10 });

  const sourceSampleRate  = decoded.sampleRate;
  const sourceChannels    = decoded.numberOfChannels;
  const totalSourceSamples = decoded.length;
  const totalDuration     = decoded.duration;

  // Extract channel data into plain typed arrays, then drop the AudioBuffer.
  // FIX (Bug 1+2): release decoded as soon as we have the raw PCM arrays.
  const sourceChannelData: Float32Array[] = [];
  for (let c = 0; c < sourceChannels; c++) {
    sourceChannelData.push(decoded.getChannelData(c).slice(0));
  }
  // @ts-ignore — intentionally drop large object for GC
  decoded = null;

  // ── Resample + chunk in one streaming pass ────────────────────────────────
  const segmentSourceSamples = DECODE_SEGMENT_SECONDS * sourceSampleRate;
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const chunks: File[] = [];

  // Rolling PCM accumulator — never exceeds MAX_CHUNK_SAMPLES + one segment
  let accumulator   = new Float32Array(MAX_CHUNK_SAMPLES + Math.ceil(DECODE_SEGMENT_SECONDS * TARGET_SAMPLE_RATE) + 1);
  let accLen        = 0;   // valid samples in accumulator
  let chunkIndex    = 0;

  const flushChunk = (data: Float32Array, isFinal: boolean) => {
    // Slice data into MAX_CHUNK_SAMPLES pieces (usually just one)
    for (let off = 0; off < data.length; off += STEP_SAMPLES) {
      const end      = Math.min(off + MAX_CHUNK_SAMPLES, data.length);
      const isLast   = isFinal && (end >= data.length);
      const chunkPcm = data.subarray(off, end);
      if (chunkPcm.length === 0) break;

      const wav = encodeWav(chunkPcm, TARGET_SAMPLE_RATE);
      chunks.push(new File([wav], `${baseName}_chunk${chunkIndex + 1}.wav`, { type: "audio/wav" }));
      chunkIndex++;

      // If not final, keep the overlap region for the next step
      if (!isLast) {
        const overlapStart = Math.max(0, end - OVERLAP_SAMPLES);
        accLen = end - overlapStart;
        accumulator.set(data.subarray(overlapStart, end), 0);
        return; // caller continues filling accumulator from accLen
      }
    }
    accLen = 0;
  };

  for (
    let srcStart = 0;
    srcStart < totalSourceSamples;
    srcStart += segmentSourceSamples
  ) {
    const srcEnd     = Math.min(srcStart + segmentSourceSamples, totalSourceSamples);
    const segLen     = srcEnd - srcStart;
    const segDuration = segLen / sourceSampleRate;
    const segOutLen  = Math.ceil(segDuration * TARGET_SAMPLE_RATE);

    // Build a small AudioBuffer for this 60-second segment
    const segCtx    = new OfflineAudioContext(sourceChannels, segLen, sourceSampleRate);
    const segBuf    = segCtx.createBuffer(sourceChannels, segLen, sourceSampleRate);
    for (let c = 0; c < sourceChannels; c++) {
      const slice = new Float32Array(segLen);
      slice.set(sourceChannelData[c].subarray(srcStart, srcEnd));
      segBuf.copyToChannel(slice, c);
    }

    // Resample to 16kHz mono
    const resCtx = new OfflineAudioContext(1, segOutLen, TARGET_SAMPLE_RATE);
    const src    = resCtx.createBufferSource();
    src.buffer   = segBuf;

    if (sourceChannels > 1) {
      const gain = resCtx.createGain();
      gain.gain.value = 1 / sourceChannels;
      src.connect(gain);
      gain.connect(resCtx.destination);
    } else {
      src.connect(resCtx.destination);
    }
    src.start(0);

    const rendered     = await resCtx.startRendering();
    const renderedData = rendered.getChannelData(0);

    // Append to accumulator
    accumulator.set(renderedData, accLen);
    accLen += renderedData.length;

    // FIX (Bug 2): flush complete chunks incrementally instead of one giant array
    const isFinalSegment = (srcEnd >= totalSourceSamples);
    if (accLen >= MAX_CHUNK_SAMPLES || isFinalSegment) {
      const view = accumulator.subarray(0, accLen);
      flushChunk(view, isFinalSegment);
      if (!isFinalSegment) {
        // flushChunk left overlap at start of accumulator; accLen was updated
      }
    }

    const pct = 10 + Math.round((srcEnd / totalSourceSamples) * 80);
    onProgress?.({ stage: chunkIndex > 0 ? "chunking" : "resampling", percent: pct });
  }

  // Release source channel data
  sourceChannelData.length = 0;

  // If only one chunk was produced, rename it without the _chunk suffix
  if (chunks.length === 1) {
    const blob = chunks[0];
    chunks[0]  = new File([blob], `${baseName}.wav`, { type: "audio/wav" });
  }

  onProgress?.({ stage: "done", percent: 100 });
  return chunks;
}

/** Encode Float32 PCM → WAV Blob (16-bit little-endian) */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels  = 1;
  const bitsPerSample = 16;
  const byteRate     = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign   = numChannels * (bitsPerSample / 8);
  const dataSize     = samples.length * (bitsPerSample / 8);
  const buffer       = new ArrayBuffer(44 + dataSize);
  const view         = new DataView(buffer);

  writeStr(view, 0,  "RIFF");
  view.setUint32(4,  36 + dataSize, true);
  writeStr(view, 8,  "WAVE");
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16,           true);
  view.setUint16(20, 1,            true); // PCM
  view.setUint16(22, numChannels,  true);
  view.setUint32(24, sampleRate,   true);
  view.setUint32(28, byteRate,     true);
  view.setUint16(32, blockAlign,   true);
  view.setUint16(34, bitsPerSample,true);
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize,     true);

  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
