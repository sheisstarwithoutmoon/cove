import Groq from "groq-sdk";
import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load environment relative to this utility module
dotenv.config({ path: resolve(__dirname, "../.env") });

const keys = Array.from(new Set([
  process.env.GROQ_API_KEY1,
  process.env.GROQ_API_KEY2,
].filter(Boolean)));

let currentKeyIndex = 0;
let groqInstance = new Groq({ apiKey: keys[currentKeyIndex] || "" });

export const rotateGroqKey = () => {
  if (keys.length > 0) {
    currentKeyIndex = (currentKeyIndex + 1) % keys.length;
    groqInstance = new Groq({ apiKey: keys[currentKeyIndex] });
    console.log(`[Groq API] Rotated to key index ${currentKeyIndex + 1}/${keys.length}`);
  }
};

const isRotatableError = (error) => {
  const status = error?.status;
  const message = String(error?.message || "");
  return (
    status === 429 ||
    status === 401 ||
    status === 403 ||
    message.includes("429") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("rate limit") ||
    message.includes("limit exceeded") ||
    message.includes("quota")
  );
};

export const groq = {
  chat: {
    completions: {
      create: async (params) => {
        let attempts = 0;
        const maxAttempts = keys.length > 0 ? keys.length : 1;
        while (attempts < maxAttempts) {
          try {
            return await groqInstance.chat.completions.create(params);
          } catch (error) {
            attempts++;
            if (isRotatableError(error) && attempts < maxAttempts) {
              console.warn(`[Groq API] Error on key ${currentKeyIndex + 1}/${keys.length}: ${error.message}. Rotating key...`);
              rotateGroqKey();
              continue;
            }
            throw error;
          }
        }
      }
    }
  }
};
