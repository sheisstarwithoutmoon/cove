import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
// Load environment relative to this utility module
dotenv.config({ path: resolve(__dirname, "../.env") });
const keys = Array.from(new Set([
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY1,
  process.env.GEMINI_API_KEY2,
  process.env.GEMINI_API_KEY3,
].filter(Boolean)));
let currentKeyIndex = 0;
let aiInstance = new GoogleGenAI({ apiKey: keys[currentKeyIndex] || "" });
const rotateKey = () => {
  if (keys.length > 0) {
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    aiInstance = new GoogleGenAI({ apiKey: keys[currentKeyIndex] });
    console.log(`[Gemini API] Rotated to key index ${currentKeyIndex + 1}/${keys.length}`);
  }
};
const isRotatableError = (error) => {
  const status = error?.status;
  const errObj = error?.error;
  const message = String(error?.message || "");
  return (
    status === 429 ||
    status === 401 ||
    status === 403 ||
    status === "RESOURCE_EXHAUSTED" ||
    status === "UNAUTHENTICATED" ||
    status === "PERMISSION_DENIED" ||
    errObj?.code === 429 ||
    errObj?.code === 401 ||
    errObj?.code === 403 ||
    errObj?.status === "RESOURCE_EXHAUSTED" ||
    errObj?.status === "UNAUTHENTICATED" ||
    errObj?.status === "PERMISSION_DENIED" ||
    message.includes("429") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("UNAUTHENTICATED") ||
    message.includes("PERMISSION_DENIED") ||
    message.includes("Quota exceeded") ||
    message.includes("quota") ||
    message.includes("invalid authentication credentials")
  );
};
const isUnavailableError = (error) => {
  const status = error?.status;
  const errObj = error?.error;
  const message = String(error?.message || "");
  return (
    status === 503 ||
    status === 404 ||
    status === "UNAVAILABLE" ||
    errObj?.code === 503 ||
    errObj?.code === 404 ||
    errObj?.status === "UNAVAILABLE" ||
    message.includes("503") ||
    message.includes("404") ||
    message.includes("high demand") ||
    message.includes("UNAVAILABLE") ||
    message.includes("not found") ||
    message.includes("timeout") ||
    message.includes("Request timeout")
  );
};
export const MODEL_FALLBACK_CHAIN = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite', 
  'gemini-3.5-flash',
  'gemini-2.5-flash',
];
export const FLASH_MODEL = 'gemini-3.1-flash-lite';
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const ai = {
  models: {
    generateContent: async (params) => {
      let attempts = 0;
      const maxAttempts = keys.length > 0 ? keys.length : 1;
      while (attempts < maxAttempts) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 30s')), 30000)
          );
          return await Promise.race([
            aiInstance.models.generateContent(params),
            timeoutPromise
          ]);
        } catch (error) {
          if (isUnavailableError(error)) {
            const currentModelIndex = MODEL_FALLBACK_CHAIN.indexOf(params.model);
            if (currentModelIndex !== -1 && currentModelIndex < MODEL_FALLBACK_CHAIN.length - 1) {
              const nextModel = MODEL_FALLBACK_CHAIN[currentModelIndex + 1];
              console.warn(`[Gemini API] Model ${params.model} unavailable/not found. Falling back to ${nextModel}...`);
              params.model = nextModel;
              continue;
            }
          }
          if (isRotatableError(error) && keys.length > 1) {
            console.warn(`[Gemini API] Key error on key ${currentKeyIndex + 1} (${error.status || error.message?.substring(0, 50)}). Attempting rotation...`);
            rotateKey();
            attempts++;
            if (attempts >= maxAttempts) {
              console.error("[Gemini API] All available keys exhausted.");
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
      throw new Error("Failed to generate content after exhausting keys");
    },
    embedContent: async (params) => {
      let attempts = 0;
      const maxAttempts = keys.length > 0 ? keys.length : 1;
      while (attempts < maxAttempts) {
        try {
          return await aiInstance.models.embedContent(params);
        } catch (error) {
          if (isRotatableError(error) && keys.length > 1) {
            console.warn(`[Gemini API] Key error on key ${currentKeyIndex + 1} (embedContent) (${error.status || error.message?.substring(0, 50)}). Attempting rotation...`);
            rotateKey();
            attempts++;
            if (attempts >= maxAttempts) {
              console.error("[Gemini API] All available keys exhausted for embedding.");
              throw error;
            }
          } else {
            throw error;
          }
        }
      }
      throw new Error("Failed to embed content after exhausting keys");
    }
  }
};
export default ai;