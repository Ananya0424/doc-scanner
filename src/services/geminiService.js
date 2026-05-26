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
          messages: [
            {
              role: "system",
              content: `You are a professional document analyst. Your job is to read document text and produce clean, accurate, human-readable summaries. Always write in clear English. Never use generic filler phrases like "document processed successfully" or "text has been summarised". Base everything strictly on the actual content provided.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 400,
          temperature: 0.2,
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
      console.log("API success:", text.slice(0, 150));
      return text;

    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      if (attempt === retries) return "";
      await delay(2000);
    }
  }
  return "";
}

// Actual text se meaningful fallback — never generic
function buildFallbackSummary(text) {
  if (!text || text.trim().length < 10) return "No readable content found on this page.";
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  return sentences.slice(0, 3).join(". ") + ".";
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
        `Read the following text extracted from Page 1 of a document. Write a clear and informative summary in 3-4 sentences. 
         
Cover these points:
- What is this page about?
- What are the key details or facts mentioned?
- Who is involved (if any person, organization, date is mentioned)?

Write only the summary. Do not add any intro like "This page is about" — just write the summary directly.

Page 1 text:
${page1Text}`
      )
    : "";

  const page1Summary = p1Raw.length > 20
    ? p1Raw
    : hasPage1
      ? buildFallbackSummary(page1Text)
      : "No content found on page 1.";

  await delay(2000);

  // ── PAGE 2 SUMMARY ──────────────────────────────────────────────
  const p2Raw = hasPage2
    ? await callAPI(
        `Read the following text extracted from Page 2 of a document. Write a clear and informative summary in 3-4 sentences.

Cover these points:
- What is this page about?
- What are the key details or facts mentioned?
- Who is involved (if any person, organization, date is mentioned)?

Write only the summary. Do not add any intro like "This page is about" — just write the summary directly.

Page 2 text:
${page2Text}`
      )
    : "";

  const page2Summary = p2Raw.length > 20
    ? p2Raw
    : hasPage2
      ? buildFallbackSummary(page2Text)
      : "No content found on page 2.";

  await delay(2000);

  // ── OVERALL CONCLUSION ──────────────────────────────────────────
  let conclusionPrompt = "";

  if (hasPage1 && hasPage2) {
    conclusionPrompt = `You have summaries of two pages from the same document. Write a well-structured overall conclusion in 3-4 sentences.

Your conclusion must:
- State what the full document is about
- Highlight the most important information from both pages
- End with the key takeaway or significance of this document

Write only the conclusion. No bullet points. No headers. Just clear paragraph text.

Page 1 summary: ${page1Summary}
Page 2 summary: ${page2Summary}

Overall conclusion:`;

  } else if (hasPage1) {
    conclusionPrompt = `Based on this document page summary, write a conclusion in 3-4 sentences.

Your conclusion must:
- State what this document is about
- Highlight the most important information
- End with the key takeaway

Write only the conclusion. No bullet points. Just clear paragraph text.

Page summary: ${page1Summary}

Conclusion:`;

  } else if (hasPage2) {
    conclusionPrompt = `Based on this document page summary, write a conclusion in 3-4 sentences.

Your conclusion must:
- State what this document is about
- Highlight the most important information
- End with the key takeaway

Write only the conclusion. No bullet points. Just clear paragraph text.

Page summary: ${page2Summary}

Conclusion:`;
  }

  const conRaw = conclusionPrompt ? await callAPI(conclusionPrompt) : "";

  const overallConclusion =
    conRaw.length > 20
      ? conRaw
      : hasPage1 && hasPage2
        ? `${page1Summary} Furthermore, ${page2Summary}`
        : hasPage1
          ? page1Summary
          : page2Summary;

  return { page1Summary, page2Summary, overallConclusion };
}