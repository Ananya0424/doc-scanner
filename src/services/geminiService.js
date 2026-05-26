// src/services/geminiService.js
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  "meta-llama/llama-3.3-8b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-3-4b-it:free",
  "qwen/qwen-2.5-7b-instruct:free",
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
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `Model ${model} failed`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function summariseWithGemini(page1Text, page2Text, extraText = "") {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("API key missing — .env mein VITE_OPENROUTER_API_KEY set karo.");
  }

  const combinedExtra = extraText ? `\n\nADDITIONAL PAGES:\n${extraText}` : "";

  const prompt = `You are a document summarisation assistant.

Summarise the following document pages.

PAGE 1 TEXT:
${page1Text || "No text extracted from page 1."}

PAGE 2 TEXT:
${page2Text || "No text extracted from page 2."}${combinedExtra}

Return ONLY a valid JSON object with exactly these keys:
{
  "page1Summary": "60-80 word summary of page 1",
  "page2Summary": "60-80 word summary of page 2",
  "conclusion": "60-80 word overall conclusion"
}

No markdown, no backticks, no explanation. Only raw JSON.`;

  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    try {
      console.log(`Trying model: ${MODELS[i]}`);
      const rawText = await tryModel(MODELS[i], prompt, apiKey);

      // Strip markdown fences if any
      const clean = rawText.replace(/```json|```/gi, "").trim();

      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        // Try extracting JSON from response
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error("JSON parse failed");
        }
      }

      if (!parsed.page1Summary || !parsed.conclusion) {
        throw new Error("Incomplete response from model");
      }

      return parsed;
    } catch (err) {
      console.warn(`Model ${MODELS[i]} failed:`, err.message);
      lastError = err;
      // Wait before trying next model
      if (i < MODELS.length - 1) await delay(1000);
    }
  }

  throw new Error(
    lastError?.message || "Saare models fail ho gaye. Thodi der baad retry karo."
  );
}