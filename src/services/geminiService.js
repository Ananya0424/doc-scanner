// src/services/geminiService.js

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ✅ Updated models - 2025 ke best free models on OpenRouter
const MODELS = [
  "qwen/qwen3-8b:free",
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "microsoft/phi-4-reasoning-plus:free",
  "qwen/qwen3-14b:free",
  "google/gemma-3-27b-it:free",
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function tryModel(model, prompt, apiKey) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Document Scanner Summariser",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a document summarisation assistant. You ONLY summarise the text provided by the user. You NEVER add outside knowledge. You NEVER explain what the app does. You ONLY summarise the actual document content given to you. Always respond with raw JSON only.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    }),
  });

  if (response.status === 429) {
    throw new Error(`RATE_LIMITED`);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Model ${model} failed with ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content.trim()) throw new Error("Empty response from model");
  return content;
}

export async function summariseWithGemini(page1Text, page2Text, extraText = "") {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("API key missing — .env mein VITE_OPENROUTER_API_KEY set karo.");
  }

  const hasPage1 = page1Text && page1Text.trim().length > 10;
  const hasPage2 = page2Text && page2Text.trim().length > 10;
  const hasExtra = extraText && extraText.trim().length > 10;

  if (!hasPage1 && !hasPage2) {
    throw new Error("Document mein koi readable text nahi mila. Image clearer karo.");
  }

  // ✅ Very strict prompt — model ko force karo sirf document content summarise karne ke liye
  const prompt = `TASK: Summarise ONLY the document text I provide below. Do NOT write about any app, tool, or software. Do NOT add any information not present in the text below.

${hasPage1 ? `=== PAGE 1 DOCUMENT TEXT ===\n${page1Text.trim()}` : "=== PAGE 1 ===\nNo text available."}

${hasPage2 ? `=== PAGE 2 DOCUMENT TEXT ===\n${page2Text.trim()}` : "=== PAGE 2 ===\nNo text available."}

${hasExtra ? `=== ADDITIONAL PAGES TEXT ===\n${extraText.trim()}` : ""}

INSTRUCTIONS:
- page1Summary: Write 50-70 words summarising ONLY what PAGE 1 text says. If page 1 has no text, write "Page 1 mein koi text nahi mila."
- page2Summary: Write 50-70 words summarising ONLY what PAGE 2 text says. If page 2 has no text, write "Page 2 mein koi text nahi mila."
- conclusion: Write 60-80 words combining the KEY POINTS from the document pages above. What is this document about? What is its main message or purpose based on the text given?

Respond ONLY with this exact JSON. No markdown. No explanation. No extra text:
{"page1Summary":"...","page2Summary":"...","conclusion":"..."}`;

  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    try {
      console.log(`Trying: ${MODELS[i]}`);
      const rawText = await tryModel(MODELS[i], prompt, apiKey);

      // Clean response
      let clean = rawText
        .replace(/```json/gi, "")
        .replace(/```/gi, "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "") // Remove chain-of-thought if any
        .trim();

      // Extract JSON object
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate
      if (!parsed.page1Summary || !parsed.page2Summary || !parsed.conclusion) {
        throw new Error("Incomplete JSON keys");
      }

      // ✅ Sanity check: if conclusion talks about "app" or "scanner" it's hallucinating
      const conclusionLower = parsed.conclusion.toLowerCase();
      const hallucination = ["document scanner", "this app", "this tool", "web app", "summariser", "ocr"].some(
        (w) => conclusionLower.includes(w)
      );
      if (hallucination) {
        console.warn(`Model ${MODELS[i]} hallucinated — skipping`);
        throw new Error("Model hallucinated — retrying with next model");
      }

      console.log(`✅ Success with: ${MODELS[i]}`);
      return parsed;

    } catch (err) {
      if (err.message === "RATE_LIMITED") {
        console.log(`Rate limited: ${MODELS[i]}`);
      } else {
        console.warn(`Failed (${MODELS[i]}): ${err.message}`);
      }
      lastError = err;
      if (i < MODELS.length - 1) await delay(800);
    }
  }

  throw new Error(
    "Saare models abhi busy hain. 1-2 minute baad retry karo ya OpenRouter dashboard check karo."
  );
}