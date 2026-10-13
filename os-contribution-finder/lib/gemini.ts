import { GoogleGenAI } from "@google/genai";
import { EMBEDDING_MODEL, EMBEDDING_DIM } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** L2-normalize a vector (required for truncated Gemini embeddings). */
export function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Embed an array of texts using Gemini, batched in groups of 25 with retry & rate limiting.
 * Returns one normalized 768-dim vector per input text.
 */
export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][]> {
  const out: number[][] = [];
  const BATCH_SIZE = 25;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    // Exponential backoff retry loop for 429 quota/rate limit errors
    let retries = 0;
    const maxRetries = 5;
    let success = false;

    while (!success && retries <= maxRetries) {
      try {
        const res = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: batch,
          config: { taskType, outputDimensionality: EMBEDDING_DIM },
        });

        for (const e of res.embeddings ?? []) {
          out.push(normalize(e.values ?? []));
        }
        success = true;

        // Brief delay between batches to respect free tier RPM limits
        if (i + BATCH_SIZE < texts.length) {
          await sleep(1500);
        }
      } catch (err: unknown) {
        retries++;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isPaymentRequired =
          errMsg.includes("402") ||
          errMsg.includes("prepayment") ||
          errMsg.includes("credits are depleted");

        if (isPaymentRequired) {
          // Do not retry 402 - credits are depleted
          throw err;
        }

        const isRateLimit =
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota");

        if (isRateLimit && retries <= maxRetries) {
          const waitTime = Math.pow(2, retries) * 2000; // 4s, 8s, 16s, 32s...
          console.warn(
            `[Gemini] Hit rate limit (429). Retrying batch in ${waitTime / 1000}s (attempt ${retries}/${maxRetries})...`
          );
          await sleep(waitTime);
        } else {
          throw err;
        }
      }
    }
  }

  if (out.length !== texts.length) {
    throw new Error(
      `Embedding count mismatch: expected ${texts.length}, got ${out.length}`
    );
  }

  return out;
}

