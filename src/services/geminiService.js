// src/services/geminiService.js

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemma-3-4b-it:free";

export async function summariseText(page1Text, page2Text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not found. Add VITE_OPENROUTER_API_KEY to your .env file.");
  }

  const hasPage1 = page1Text && page1Text.trim().length > 10;
  const hasPage2 = page2Text && page2Text.trim().length > 10;

  const prompt = `You are a document summariser. Read the following document text carefully and summarise it.

PAGE 1:
${hasPage1 ? page1Text : "No text available"}

PAGE 2:
${hasPage2 ? page2Text : "No text available"}

Write a JSON response with these three fields:
- page1Summary: A 50-80 word summary of what PAGE 1 says. Write about the actual topic and content of page 1.
- page2Summary: A 50-80 word summary of what PAGE 2 says. Write about the actual topic and content of page 2.
- overallConclusion: A 60-90 word conclusion that combines the main ideas from both pages. This must be about the document topic, not about the process of summarising.

Example of WRONG overallConclusion: "Document processed successfully. The text has been summarised."
Example of CORRECT overallConclusion: "Artificial Intelligence is transforming modern industries by enabling machines to learn and reason. From healthcare to autonomous vehicles, AI applications are growing rapidly. While challenges around ethics and job displacement remain, AI presents enormous opportunities for innovation and human progress."

Return ONLY the JSON object. No extra text.

{
  "page1Summary": "...",
  "page2Summary": "...",
  "overallConclusion": "..."
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
      messages: [
        {
          role: "system",
          content: "You are a helpful document summariser. Always summarise the actual content of the document. Never write generic phrases like 'Document processed successfully' or 'Text has been summarised'. Always write about the actual topic."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 700,
      temperature: 0.2,
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

  // Strip markdown fences
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);

    // Detect generic conclusion and replace with content-based one
    const genericPhrases = [
      "document processed",
      "text has been summarised",
      "text has been summarized",
      "extracted text",
      "successfully summarised",
      "successfully summarized",
    ];

    const conclusionIsGeneric = genericPhrases.some(phrase =>
      parsed.overallConclusion?.toLowerCase().includes(phrase)
    );

    if (conclusionIsGeneric) {
      // Build conclusion from actual text
      const combined = [page1Text, page2Text].filter(Boolean).join(" ");
      const words = combined.split(/\s+/).slice(0, 60).join(" ");
      parsed.overallConclusion = `Based on the document content: ${words}...`;
    }

    return {
      page1Summary: parsed.page1Summary || "No content available for page 1.",
      page2Summary: parsed.page2Summary || "No content available for page 2.",
      overallConclusion: parsed.overallConclusion || "No conclusion available.",
    };

  } catch {
    // JSON parse failed — extract meaningful text from raw response
    const combined = [page1Text, page2Text].filter(Boolean).join(" ");
    return {
      page1Summary: hasPage1 ? page1Text.trim().slice(0, 200) + "..." : "No content available for page 1.",
      page2Summary: hasPage2 ? page2Text.trim().slice(0, 200) + "..." : "No content available for page 2.",
      overallConclusion: "The document discusses: " + combined.split(/\s+/).slice(0, 50).join(" ") + "...",
    };
  }
}