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
      if (attempt === retries) return "";
      await delay(2000);
    }
  }
  return "";
}

// Actual text se smart fallback summary banao — generic nahi
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

  // ── PAGE 1 SUMMARY ──────────────────────────────────────────────
  const p1Raw = hasPage1
    ? await callAPI(
        `Summarise this text in 2-3 sentences. Write only the summary, nothing else:\n\n${page1Text}`
      )
    : "";
  const page1Summary = p1Raw.length > 20
    ? p1Raw
    : hasPage1
      ? buildFallbackSummary(page1Text)
      : "No content on page 1.";

  await delay(2000);

  // ── PAGE 2 SUMMARY ──────────────────────────────────────────────
  const p2Raw = hasPage2
    ? await callAPI(
        `Summarise this text in 2-3 sentences. Write only the summary, nothing else:\n\n${page2Text}`
      )
    : "";
  const page2Summary = p2Raw.length > 20
    ? p2Raw
    : hasPage2
      ? buildFallbackSummary(page2Text)
      : "No content on page 2.";

  await delay(2000);

  // ── OVERALL CONCLUSION ──────────────────────────────────────────
  let conclusionPrompt = "";

  if (hasPage1 && hasPage2) {
    // Dono pages uploaded hain
    conclusionPrompt = `Two page summaries are given below. Write an overall conclusion in 2-3 sentences about what the full document covers and its main takeaway. Write only the conclusion, nothing else.

Page 1: ${page1Summary}
Page 2: ${page2Summary}

Overall conclusion:`;

  } else if (hasPage1) {
    // Sirf Page 1 upload hua hai
    conclusionPrompt = `Based on this document page summary, write a conclusion in 2-3 sentences about what this document is about and its main takeaway. Write only the conclusion, nothing else.

Page summary: ${page1Summary}

Conclusion:`;

  } else if (hasPage2) {
    // Sirf Page 2 upload hua hai
    conclusionPrompt = `Based on this document page summary, write a conclusion in 2-3 sentences about what this document is about and its main takeaway. Write only the conclusion, nothing else.

Page summary: ${page2Summary}

Conclusion:`;
  }

  const conRaw = conclusionPrompt ? await callAPI(conclusionPrompt) : "";

  // Fallback — API fail hone par actual summaries se banao, generic nahi
  const overallConclusion =
    conRaw.length > 20
      ? conRaw
      : hasPage1 && hasPage2
        ? `This document discusses ${page1Summary.slice(0, 120)}. It further covers ${page2Summary.slice(0, 120)}.`
        : hasPage1
          ? page1Summary
          : page2Summary;

  return { page1Summary, page2Summary, overallConclusion };
}