// src/services/geminiService.js

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

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
          content: `You are a strict document summariser. 
Rules you MUST follow:
1. ONLY summarise the document text provided by the user.
2. NEVER write generic phrases like "Document processed successfully" or "text has been summarised".
3. NEVER mention any app, tool, scanner, or software.
4. conclusion must be a REAL summary combining key points from BOTH pages.
5. Always respond with ONLY raw JSON — no markdown, no backticks, no extra text.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.2,
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Status ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!content.trim()) throw new Error("Empty response");
  return content;
}

export async function summariseWithGemini(page1Text, page2Text, extraText = "") {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey) throw new Error("API key missing — .env mein VITE_OPENROUTER_API_KEY set karo.");

  const hasPage1 = page1Text && page1Text.trim().length > 10;
  const hasPage2 = page2Text && page2Text.trim().length > 10;

  if (!hasPage1 && !hasPage2) {
    throw new Error("Document mein koi readable text nahi mila.");
  }

  const p1 = hasPage1 ? page1Text.trim() : "No text available for page 1.";
  const p2 = hasPage2 ? page2Text.trim() : "No text available for page 2.";
  const extra = extraText?.trim() ? `\n\nADDITIONAL PAGES:\n${extraText.trim()}` : "";

  const prompt = `Read the following document pages carefully and summarise them.

=== PAGE 1 ===
${p1}

=== PAGE 2 ===
${p2}${extra}

Now write a JSON response with these exact 3 keys:

"page1Summary" → 50-70 words: What does PAGE 1 say? What topic, facts, or ideas does it cover?
"page2Summary" → 50-70 words: What does PAGE 2 say? What topic, facts, or ideas does it cover?
"conclusion"   → 60-80 words: What is the OVERALL message of this document? Combine the main points from both pages into a unified conclusion about the document's subject matter.

IMPORTANT: 
- conclusion must reflect the ACTUAL content of the document above.
- Do NOT write "Document processed" or any meta-commentary.
- Write as if explaining the document to someone who hasn't read it.

Respond with ONLY this JSON, nothing else:
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
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

      // Extract JSON
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.page1Summary || !parsed.page2Summary || !parsed.conclusion) {
        throw new Error("Missing keys in response");
      }

      // ❌ Reject fake/generic conclusions
      const fake = [
        "document processed",
        "text has been summarised",
        "text has been summarized", 
        "extracted text",
        "this app",
        "this tool",
        "web application",
        "document scanner",
      ];
      const conclusionLower = parsed.conclusion.toLowerCase();
      const isFake = fake.some((w) => conclusionLower.includes(w));

      if (isFake) {
        console.warn(`Fake conclusion from ${MODELS[i]}, retrying...`);
        throw new Error("Generic conclusion detected");
      }

      console.log(`✅ Success: ${MODELS[i]}`);
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

  throw new Error("Saare models busy hain. 1-2 minute baad retry karo.");
}