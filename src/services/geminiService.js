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
          content: "You are a strict document summariser. ONLY summarise the document text provided. NEVER write generic phrases like Document processed successfully. NEVER mention any app or tool. Always respond with ONLY raw JSON.",
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
  if (!apiKey) throw new Error("API key missing.");

  const p1 = page1Text?.trim() || "No text available.";
  const p2 = page2Text?.trim() || "No text available.";
  const extra = extraText?.trim() ? `\n\nADDITIONAL PAGES:\n${extraText.trim()}` : "";

  const prompt = `Read these document pages and summarise them.

=== PAGE 1 ===
${p1}

=== PAGE 2 ===
${p2}${extra}

Respond with ONLY this JSON:
{"page1Summary":"50-70 words summarising page 1 content","page2Summary":"50-70 words summarising page 2 content","conclusion":"60-80 words combining main message of both pages"}`;

  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    try {
      console.log(`Trying: ${MODELS[i]}`);
      const rawText = await tryModel(MODELS[i], prompt, apiKey);

      let clean = rawText
        .replace(/```json/gi, "")
        .replace(/```/gi, "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.page1Summary || !parsed.page2Summary || !parsed.conclusion) {
        throw new Error("Missing keys");
      }

      const fake = ["document processed","text has been summarised","text has been summarized","extracted text","this app","this tool","web application","document scanner"];
      if (fake.some((w) => parsed.conclusion.toLowerCase().includes(w))) {
        throw new Error("Generic conclusion detected");
      }

      console.log(`Success: ${MODELS[i]}`);
      return parsed;

    } catch (err) {
      console.log(err.message === "RATE_LIMITED" ? `Rate limited: ${MODELS[i]}` : `Failed (${MODELS[i]}): ${err.message}`);
      lastError = err;
      if (i < MODELS.length - 1) await delay(800);
    }
  }

  throw new Error("Saare models busy hain. 1-2 minute baad retry karo.");
}
