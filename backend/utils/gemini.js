import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

if (!process.env.GEMINI_API_KEY) {
  console.warn("[gemini-client] GEMINI_API_KEY not found in environment variables.");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
