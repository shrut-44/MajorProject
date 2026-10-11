import { GoogleGenAI } from "@google/genai";
import { EMBEDDING_MODEL, EMBEDDING_DIM } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** L2-normalize a vector (required for truncated Gemini embeddings). */
export function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/**
 * Embed an array of texts using Gemini, batched in groups of 50.
 * Returns one normalized 768-dim vector per input text.
 */
export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][]> {
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const res = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: { taskType, outputDimensionality: EMBEDDING_DIM },
    });

    for (const e of res.embeddings ?? []) {
      out.push(normalize(e.values ?? []));
    }
  }

  if (out.length !== texts.length) {
    throw new Error(
      `Embedding count mismatch: expected ${texts.length}, got ${out.length}`
    );
  }

  return out;
}
