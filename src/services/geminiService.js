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

// ─── Local fallback summary (when all API models fail) ───
function generateLocalSummary(page1Text, page2Text) {
  const summarise = (text, limit = 400) => {
    if (!text || text.trim().length < 10)
      return "No readable text was found on this page.";

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let result = "";
    for (const s of sentences) {
      if ((result + s).length > limit) break;
      result += s.trim() + " ";
    }
    return result.trim() || text.substring(0, limit).trim() + "...";
  };

  const p1 = summarise(page1Text, 400);
  const p2 = summarise(page2Text, 400);

  // Build a meaningful conclusion from the extracted content
  const getKeyPoints = (text) => {
    if (!text || text.trim().length < 10) return "";
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 3).join(" ").trim();
  };

  const c1 = getKeyPoints(page1Text);
  const c2 = getKeyPoints(page2Text);

  let overallConclusion = "";
  if (c1 && c2) {
    overallConclusion = `This document covers the following key information: ${c1} Additionally, ${c2} Together, these pages provide a comprehensive overview of the subject matter discussed in the document.`;
  } else if (c1) {
    overallConclusion = `This document contains the following key information: ${c1} The document provides useful insights on the covered topic.`;
  } else if (c2) {
    overallConclusion = `This document contains the following key information: ${c2} The document provides useful insights on the covered topic.`;
  } else {
    overallConclusion =
      "Text was extracted from the document but could not be summarised locally. Please check your API key for AI-powered summarisation.";
  }

  return { page1Summary: p1, page2Summary: p2, overallConclusion };
}

// ─── Try a single model ───
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
          content: `You are an expert document summariser. Your job is to read the provided document text carefully and produce a detailed, accurate, and well-structured summary. 

RULES:
1. ONLY summarise the actual content provided — never invent or hallucinate information.
2. Each page summary should capture ALL key points, facts, numbers, and important details from that page.
3. The overall conclusion must synthesise the main themes from ALL pages into a coherent final paragraph.
4. Write in clear, professional English.
5. If a page has no text, say "No readable content found on this page."
6. Respond with ONLY valid JSON — no markdown, no code fences, no extra text.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.15,
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

// ─── Main export — called from App.jsx ───
export async function summariseText(page1Text, page2Text, extraText = "") {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim().length < 10) {
    console.warn("API key missing or invalid — using local fallback");
    return generateLocalSummary(page1Text, page2Text);
  }

  const p1 = page1Text?.trim() || "No text available.";
  const p2 = page2Text?.trim() || "No text available.";
  const extra = extraText?.trim()
    ? `\n\n=== ADDITIONAL PAGES ===\n${extraText.trim()}`
    : "";

  const prompt = `Carefully read the following document pages and provide a thorough, detailed summary of each page, followed by an overall conclusion that ties everything together.

=== PAGE 1 TEXT ===
${p1}

=== PAGE 2 TEXT ===
${p2}${extra}

INSTRUCTIONS:
- For page1Summary: Write a detailed 60-100 word summary covering ALL important points, facts, data, and key information from Page 1.
- For page2Summary: Write a detailed 60-100 word summary covering ALL important points, facts, data, and key information from Page 2. If Page 2 has no text, write "No content found on Page 2."
- For overallConclusion: Write a 80-120 word synthesis that combines the main themes, key takeaways, and important findings from ALL pages into one cohesive conclusion paragraph.

Respond with ONLY this exact JSON structure (no markdown, no code blocks):
{"page1Summary":"...","page2Summary":"...","overallConclusion":"..."}`;

  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    try {
      console.log(`🔄 Trying model: ${MODELS[i]}`);
      const rawText = await tryModel(MODELS[i], prompt, apiKey);

      // Clean response — remove markdown fences, thinking tags, etc.
      let clean = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .replace(/^\s*json\s*/i, "")
        .trim();

      // Extract JSON object
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields exist and have content
      if (!parsed.page1Summary && !parsed.page2Summary) {
        throw new Error("Both summaries are empty");
      }

      // Normalise field names — handle various AI response formats
      const result = {
        page1Summary:
          parsed.page1Summary ||
          parsed.page1_summary ||
          parsed.summary1 ||
          "No summary available for Page 1.",
        page2Summary:
          parsed.page2Summary ||
          parsed.page2_summary ||
          parsed.summary2 ||
          "No content found on Page 2.",
        overallConclusion:
          parsed.overallConclusion ||
          parsed.overall_conclusion ||
          parsed.conclusion ||
          parsed.overall ||
          "No conclusion was generated.",
      };

      console.log(`✅ Success with model: ${MODELS[i]}`);
      return result;
    } catch (err) {
      console.warn(
        err.message === "RATE_LIMITED"
          ? `⚠️ Rate limited: ${MODELS[i]}`
          : `❌ Failed (${MODELS[i]}): ${err.message}`
      );
      lastError = err;
      if (i < MODELS.length - 1) await delay(1000);
    }
  }

  // All API models failed → use local fallback
  console.warn(
    "All API models failed — generating local summary from extracted text"
  );
  console.warn("Last error:", lastError?.message);
  return generateLocalSummary(page1Text, page2Text);
}