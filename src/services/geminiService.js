// src/services/geminiService.js

// ✅ FIXED: was VITE_OPENROUTER_API_KEY — your .env has VITE_GEMINI_API_KEY
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Calls Gemini API with retry logic.
 */
async function callGemini(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  // System instruction baked into user turn (Gemini Flash style)
                  text: `You are a professional document analyst. Read the document text and produce clean, accurate, human-readable summaries. Always write in clear English. Never use generic filler phrases like "document processed successfully". Base everything strictly on the actual content provided.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 400,
          },
        }),
      })

      if (response.status === 429) {
        console.log(`Rate limited. Attempt ${attempt}/${retries}. Waiting...`)
        await delay(attempt * 3000)
        continue
      }

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(`Gemini API error: ${errData?.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      console.log('Gemini success:', text.slice(0, 150))
      return text

    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message)
      if (attempt === retries) return ''
      await delay(2000)
    }
  }
  return ''
}

/**
 * Builds a meaningful fallback summary from raw text — never generic.
 */
function buildFallbackSummary(text) {
  if (!text || text.trim().length < 10) return 'No readable content found on this page.'
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
  return sentences.slice(0, 3).join('. ') + '.'
}

/**
 * Main export — summarises page1 and page2 text using Gemini.
 * Handles 1-page and 2-page documents automatically.
 *
 * @returns {{ page1Summary, page2Summary, overallConclusion }}
 */
export async function summariseText(page1Text, page2Text) {
  if (!API_KEY) {
    throw new Error('Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env file.')
  }

  const hasPage1 = page1Text && page1Text.trim().length > 10
  const hasPage2 = page2Text && page2Text.trim().length > 10

  // ── PAGE 1 SUMMARY ──────────────────────────────────────
  const p1Raw = hasPage1
    ? await callGemini(
        `Read the following text extracted from Page 1 of a document. Write a clear and informative summary in 3-4 sentences.

Cover:
- What is this page about?
- Key details or facts mentioned
- Who is involved (person, organization, dates if mentioned)

Write only the summary. No intro phrase like "This page is about".

Page 1 text:
${page1Text}`
      )
    : ''

  const page1Summary = p1Raw.length > 20
    ? p1Raw
    : hasPage1
      ? buildFallbackSummary(page1Text)
      : 'No content found on page 1.'

  await delay(1000)

  // ── PAGE 2 SUMMARY ──────────────────────────────────────
  const p2Raw = hasPage2
    ? await callGemini(
        `Read the following text extracted from Page 2 of a document. Write a clear and informative summary in 3-4 sentences.

Cover:
- What is this page about?
- Key details or facts mentioned
- Who is involved (person, organization, dates if mentioned)

Write only the summary. No intro phrase like "This page is about".

Page 2 text:
${page2Text}`
      )
    : ''

  const page2Summary = p2Raw.length > 20
    ? p2Raw
    : hasPage2
      ? buildFallbackSummary(page2Text)
      : ''   // Empty string — App.jsx will conditionally hide it

  await delay(1000)

  // ── OVERALL CONCLUSION ──────────────────────────────────
  let conclusionPrompt = ''

  if (hasPage1 && hasPage2) {
    conclusionPrompt = `You have summaries of two pages from the same document. Write a well-structured overall conclusion in 3-4 sentences.

Your conclusion must:
- State what the full document is about
- Highlight the most important information from both pages
- End with the key takeaway or significance

Write only the conclusion. No bullet points. Clear paragraph text only.

Page 1 summary: ${page1Summary}
Page 2 summary: ${page2Summary}

Overall conclusion:`

  } else if (hasPage1) {
    conclusionPrompt = `Based on this document page summary, write a conclusion in 3-4 sentences.

Your conclusion must:
- State what this document is about
- Highlight the most important information
- End with the key takeaway

Write only the conclusion. No bullet points. Clear paragraph text only.

Page summary: ${page1Summary}

Conclusion:`

  } else if (hasPage2) {
    conclusionPrompt = `Based on this document page summary, write a conclusion in 3-4 sentences.

Your conclusion must:
- State what this document is about
- Highlight the most important information
- End with the key takeaway

Write only the conclusion. No bullet points. Clear paragraph text only.

Page summary: ${page2Summary}

Conclusion:`
  }

  const conRaw = conclusionPrompt ? await callGemini(conclusionPrompt) : ''

  const overallConclusion =
    conRaw.length > 20
      ? conRaw
      : hasPage1 && hasPage2
        ? `${page1Summary} Furthermore, ${page2Summary}`
        : hasPage1
          ? page1Summary
          : page2Summary

  return { page1Summary, page2Summary, overallConclusion }
}