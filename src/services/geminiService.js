// src/services/geminiService.js
import { ERRORS } from "../utils/errorMessages";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
export async function summariseWithGemini(page1Text, page2Text) {
  if (!GEMINI_API_KEY) throw new Error(ERRORS.GEMINI_KEY_MISSING);

  const prompt = `You are a professional document summariser. Below are the extracted texts from two pages of a document.

PAGE 1:
${page1Text || "(no text)"}

PAGE 2:
${page2Text || "(no text)"}

Return a JSON object with exactly these three keys:
{
  "page1Summary": "50-80 word summary of page 1",
  "page2Summary": "50-80 word summary of page 2",
  "conclusion": "60-100 word overall conclusion combining both pages"
}

Return ONLY valid JSON, no markdown, no extra text.`;

  try {
    console.log("Calling Gemini API...");
    console.log("API Key present:", !!GEMINI_API_KEY);

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    console.log("Response status:", response.status);

    const data = await response.json();
    console.log("Full response:", JSON.stringify(data));

    if (!response.ok) {
      console.error("API error:", data);
      throw new Error(data?.error?.message || ERRORS.GEMINI_FAILED);
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Raw text:", raw);

    if (!raw) throw new Error(ERRORS.GEMINI_EMPTY);

    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    console.error("Gemini catch error:", err.message);
    if (err.message.includes("fetch")) throw new Error(ERRORS.GEMINI_NETWORK);
    throw err;
  }
}
