// src/services/geminiService.js
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function callGemini(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a professional document analyst. Always write in clear English. Use specific details from the text provided. Never write generic filler.\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 400,
          },
        }),
      })

      if (response.status === 429) {
        await delay(attempt * 3000)
        continue
      }
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(`Gemini error: ${errData?.error?.message || response.statusText}`)
      }

      const data = await response.json()
      return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''

    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message)
      if (attempt === retries) return ''
      await delay(2000)
    }
  }
  return ''
}

function buildFallbackSummary(text) {
  if (!text || text.trim().length < 10) return 'No readable content found on this page.'
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20)
  return sentences.slice(0, 3).join('. ') + '.'
}

export async function summariseText(page1Text, page2Text) {
  if (!API_KEY) throw new Error('Gemini API key not found. Add VITE_GEMINI_API_KEY to your .env file.')

  // ✅ Safe — handles undefined, null, empty string all correctly
  const p1 = (page1Text || '').trim()
  const p2 = (page2Text || '').trim()
  const hasPage1 = p1.length > 10
  const hasPage2 = p2.length > 10

  // ── PAGE 1 SUMMARY ──────────────────────────────────────
  const p1Raw = hasPage1
    ? await callGemini(`Read the following text from Page 1 of a document. Write a clear summary in 3-4 sentences covering: what this page is about, key details, and any person/organization/dates mentioned. Write only the summary, no intro.

Page 1 text:
${p1}`)
    : ''

  const page1Summary = p1Raw.length > 20
    ? p1Raw
    : hasPage1 ? buildFallbackSummary(p1) : 'No content found on page 1.'

  await delay(1000)

  // ── PAGE 2 SUMMARY ──────────────────────────────────────
  const p2Raw = hasPage2
    ? await callGemini(`Read the following text from Page 2 of a document. Write a clear summary in 3-4 sentences covering: what this page is about, key details, and any person/organization/dates mentioned. Write only the summary, no intro.

Page 2 text:
${p2}`)
    : ''

  const page2Summary = p2Raw.length > 20
    ? p2Raw
    : hasPage2 ? buildFallbackSummary(p2) : ''

  await delay(1000)

  // ── OVERALL CONCLUSION ──────────────────────────────────
  // ✅ FIXED: conclusion always generates — whether 1 page or 2 pages
  let conclusionPrompt = ''

  if (hasPage1 && hasPage2) {
    // Both pages uploaded
    conclusionPrompt = `You are analysing a 2-page document. Here is the actual text from both pages and their summaries.

ACTUAL PAGE 1 TEXT:
${p1}

ACTUAL PAGE 2 TEXT:
${p2}

PAGE 1 SUMMARY: ${page1Summary}
PAGE 2 SUMMARY: ${page2Summary}

Write a concluding paragraph of 4-5 sentences that:
1. Identifies the document type (certificate, letter, report, etc.)
2. Mentions key person, organization, dates from the actual text
3. Combines insights from both pages
4. States the significance or purpose of this document

Write only the conclusion. Use specific details. No bullet points.`

  } else if (hasPage1) {
    // ✅ Only page 1 uploaded — conclusion still generates
    conclusionPrompt = `You are analysing a document. Here is the actual text and its summary.

ACTUAL DOCUMENT TEXT:
${p1}

SUMMARY: ${page1Summary}

Write a concluding paragraph of 4-5 sentences that:
1. Identifies the document type (certificate, letter, report, etc.)
2. Mentions the key person, organization, dates from the actual text
3. Explains the purpose of this document
4. States its significance or key takeaway

Write only the conclusion. Use specific details from the text. No bullet points.`

  } else if (hasPage2) {
    // ✅ Only page 2 uploaded — conclusion still generates
    conclusionPrompt = `You are analysing a document. Here is the actual text and its summary.

ACTUAL DOCUMENT TEXT:
${p2}

SUMMARY: ${page2Summary}

Write a concluding paragraph of 4-5 sentences that:
1. Identifies the document type (certificate, letter, report, etc.)
2. Mentions the key person, organization, dates from the actual text
3. Explains the purpose of this document
4. States its significance or key takeaway

Write only the conclusion. Use specific details from the text. No bullet points.`
  }

  const conRaw = conclusionPrompt ? await callGemini(conclusionPrompt) : ''

  const overallConclusion = conRaw.length > 20
    ? conRaw
    : hasPage1 && hasPage2
      ? `${page1Summary} Furthermore, ${page2Summary}`
      : hasPage1 ? page1Summary : page2Summary

  return { page1Summary, page2Summary, overallConclusion }
}