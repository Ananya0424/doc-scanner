const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-r1-0528:free";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function callAPI(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Document Scanner",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (response.status === 429) {
        console.log(`Rate limited. Attempt ${attempt}/${retries}. Waiting...`);
        await delay(attempt * 3000);
        continue;
      }

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content?.trim() || "";
      console.log("API success:", text.slice(0, 100));
      return text;

    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      if (attempt === retries) return ""; // ← empty return, fallback handle karega
      await delay(2000);
    }
  }
  return "";
}

// ✅ Actual text se smart summary banao — generic nahi
function buildFallbackSummary(text) {
  if (!text || text.trim().length < 10) return "No content available.";
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 3)
    .join(". ") + ".";
}

export async function summariseText(page1Text, page2Text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not found. Check .env file.");
  }

  const hasPage1 = page1Text && page1Text.trim().length > 10;
  const hasPage2 = page2Text && page2Text.trim().length > 10;

  // Page 1
  const p1Raw = hasPage1
    ? await callAPI(`Summarise in 2-3 sentences. Write only the summary:\n\n${page1Text}`)
    : "";
  const page1Summary = p1Raw.length > 20 ? p1Raw : buildFallbackSummary(page1Text);

  await delay(2000);

  // Page 2
  const p2Raw = hasPage2
    ? await callAPI(`Summarise in 2-3 sentences. Write only the summary:\n\n${page2Text}`)
    : "";
  const page2Summary = p2Raw.length > 20 ? p2Raw : buildFallbackSummary(page2Text);

  await delay(2000);

  // Conclusion
  const conRaw = (hasPage1 || hasPage2)
    ? await callAPI(
        `Two page summaries are given. Write an overall conclusion in 2-3 sentences about what the full document covers and its main takeaway. Write only the conclusion.

Page 1: ${page1Summary}
Page 2: ${page2Summary}

Overall conclusion:`
      )
    : "";

  // ✅ AI se nahi aaya toh summaries se khud banao — NEVER generic text
  const overallConclusion =
    conRaw.length > 20
      ? conRaw
      : `This document discusses ${page1Summary.slice(0, 120)}. It further covers ${page2Summary.slice(0, 120)}.`;

  return { page1Summary, page2Summary, overallConclusion };
}