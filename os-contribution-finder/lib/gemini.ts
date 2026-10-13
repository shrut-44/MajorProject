import { GoogleGenAI } from "@google/genai";
import { EMBEDDING_MODEL, EMBEDDING_DIM } from "./types";

/**
 * Initialize the Gemini client.
 * Uses Vertex AI when GOOGLE_CLOUD_PROJECT is set (uses ADC / service-account),
 * otherwise falls back to Google AI Studio with GEMINI_API_KEY.
 */
function createAIClient(): GoogleGenAI {
  const project = process.env.GOOGLE_CLOUD_PROJECT;

  if (project) {
    // Vertex AI mode — uses Application Default Credentials (ADC).
    // Locally: `gcloud auth application-default login`
    // Vercel/production: GOOGLE_APPLICATION_CREDENTIALS_JSON env var decoded below.
    console.log(
      `[Gemini] Using Vertex AI (project=${project}, location=${process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1"})`
    );
    return new GoogleGenAI({
      vertexai: true,
      project,
      location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
    });
  }

  // Fallback: Google AI Studio API key mode
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "Missing Gemini configuration. Set GOOGLE_CLOUD_PROJECT for Vertex AI or GEMINI_API_KEY for AI Studio."
    );
  }

  console.log("[Gemini] Using Google AI Studio (API key)");
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

/**
 * Bootstrap service-account credentials for Vercel / serverless environments.
 * If GOOGLE_APPLICATION_CREDENTIALS_JSON is set (base64-encoded JSON key file),
 * decode it to a temp file and point GOOGLE_APPLICATION_CREDENTIALS at it.
 */
function bootstrapCredentials(): void {
  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require("os");

    const decoded = Buffer.from(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
      "base64"
    ).toString("utf-8");
    const tmpPath = path.join(os.tmpdir(), "gcp-sa-key.json");
    fs.writeFileSync(tmpPath, decoded);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  }
}

// Run credential bootstrap once at module load time
bootstrapCredentials();

const ai = createAIClient();

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

        // Brief delay between batches to respect rate limits
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
