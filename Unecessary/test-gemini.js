/*
 * UNNECESSARY / DEPRECATED:
 * Standalone test script for Gemini API testing. Not part of runtime server.
 *
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModel(modelName) {
  try {
    console.log(`Testing ${modelName}...`);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Respond with short text: OK",
    });
    console.log(`${modelName} Success:`, response.text);
    return true;
  } catch (err) {
    console.error(`${modelName} Error:`, err.message || err);
    return false;
  }
}

async function run() {
  await testModel("gemini-3.5-flash-lite");
  await testModel("gemini-3.8-flash");
}

run();

*/

