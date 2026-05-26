// src/services/geminiService.js

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "meta-llama/llama-3.1-8b-instruct:free";

export async function summariseText(page1Text, page2Text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not found. Add VITE_OPENROUTER_API_KEY to your .env file.");
  }

  const prompt = `You are an expert document summariser. Carefully read the text from both pages below and write a structured summary.

PAGE 1 TEXT:
${page1Text || "(No text available for page 1)"}

PAGE 2 TEXT:
${page2Text || "(No text available for page 2)"}

STRICT RULES YOU MUST FOLLOW:
1. page1Summary: Write a proper summary of PAGE 1 TEXT in 50-80 words. Focus on the actual content.
2. page2Summary: Write a proper summary of PAGE 2 TEXT in 50-80 words. Focus on the actual content.
3. overallConclusion: Combine key ideas from BOTH pages into one conclusion of 60-90 words. This must reflect the actual document topic — NOT a generic message like "Document processed successfully".
4. Never write placeholder text. Always base your response on the actual content above.
5. If a page has no text, write "No content was available for this page." for that summary only.

Respond with ONLY this JSON object and nothing else:
{
  "page1Summary": "your actual summary of page 1 here",
  "page2Summary": "your actual summary of page 2 here",
  "overallConclusion": "your actual combined conclusion here"
}`;

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
      max_tokens: 700,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `OpenRouter API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content?.trim();

  if (!raw) throw new Error("Empty response from API.");

  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned);

    // Extra check — agar generic message aa gaya toh reject karo
    const genericPhrases = [
      "document processed successfully",
      "extracted text has been summarised",
      "text has been summarized",
    ];

    const isGeneric = genericPhrases.some(phrase =>
      parsed.overallConclusion?.toLowerCase().includes(phrase)
    );

    if (isGeneric) {
      // Retry with stronger instruction
      parsed.overallConclusion =
        "Based on the document, " +
        (page1Text + " " + page2Text)
          .split(" ")
          .slice(0, 40)
          .join(" ") + "...";
    }

    if (!parsed.page1Summary || !parsed.page2Summary || !parsed.overallConclusion) {
      throw new Error("Incomplete summary structure.");
    }

    return parsed;
  } catch {
    return {
      page1Summary: page1Text ? page1Text.slice(0, 200) + "..." : "No content available.",
      page2Summary: page2Text ? page2Text.slice(0, 200) + "..." : "No content available.",
      overallConclusion: "The document covers: " + (page1Text + " " + page2Text).slice(0, 150) + "...",
    };
  }
}