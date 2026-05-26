// src/services/geminiService.js
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-r1-0528:free";

export async function summariseText(page1Text, page2Text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not found.");
  }

  const hasPage1 = page1Text && page1Text.trim().length > 10;
  const hasPage2 = page2Text && page2Text.trim().length > 10;
  const combined = [page1Text, page2Text].filter(Boolean).join(" ");

  const prompt = `Summarise this document. Return ONLY a JSON object.

PAGE 1: '${hasPage1 ? page1Text : "empty"}'
PAGE 2: '${hasPage2 ? page2Text : "empty"}'

Rules:
- page1Summary: 50-80 words about PAGE 1 actual content
- page2Summary: 50-80 words about PAGE 2 actual content
- overallConclusion: 60-90 words combining BOTH pages. Must be about the document topic. NEVER write "Document processed successfully".

Return ONLY: {"page1Summary":"...","page2Summary":"...","overallConclusion":"..."}`;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Document Scanner & Summariser",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty response from API.");

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found.");

  const parsed = JSON.parse(jsonMatch[0]);

  const genericPhrases = ["document processed","text has been summarised","text has been summarized","extracted text","successfully summarised"];
  const isGeneric = genericPhrases.some(p => parsed.overallConclusion?.toLowerCase().includes(p));
  if (isGeneric) {
    parsed.overallConclusion = combined.split(/\s+/).slice(0, 60).join(" ") + "...";
  }

  return {
    page1Summary: parsed.page1Summary || "No content for page 1.",
    page2Summary: parsed.page2Summary || "No content for page 2.",
    overallConclusion: parsed.overallConclusion || "No conclusion available.",
  };
}