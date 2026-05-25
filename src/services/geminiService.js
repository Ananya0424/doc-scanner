// src/services/geminiService.js
// Now powered by OpenRouter API

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "deepseek/deepseek-v4-flash:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

const buildPrompt = (text) => `
You are a document summariser. Read the following document text and provide a structured summary.

DOCUMENT TEXT:
${text}

Respond in EXACTLY this format and nothing else:

Page 1 Summary:
[2-4 sentences summarising page 1]

Page 2 Summary:
[2-4 sentences summarising page 2]

Overall Conclusion:
[2-3 sentences with the key takeaway]

Keep the total response between 150-250 words. Be concise and factual.
`.trim();

function parseResponse(text) {
  const page1Match = text.match(/Page 1 Summary:\s*([\s\S]*?)(?=Page 2 Summary:|$)/i);
  const page2Match = text.match(/Page 2 Summary:\s*([\s\S]*?)(?=Overall Conclusion:|$)/i);
  const conclusionMatch = text.match(/Overall Conclusion:\s*([\s\S]*?)$/i);

  return {
    page1Summary: page1Match?.[1]?.trim() || "No summary available for page 1.",
    page2Summary: page2Match?.[1]?.trim() || "No summary available for page 2.",
    overallConclusion: conclusionMatch?.[1]?.trim() || "No conclusion available.",
  };
}

export async function summariseText(page1Text, page2Text) {
  const combinedText = `--- PAGE 1 ---\n${page1Text}\n\n--- PAGE 2 ---\n${page2Text}`;
  const prompt = buildPrompt(combinedText);

  let lastError = null;

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "Document Scanner Summariser",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const reason = errBody?.error?.message || `HTTP ${response.status}`;
        console.warn(`Model ${model} failed: ${reason}`);
        lastError = reason;
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content || content.trim() === "") {
        console.warn(`Model ${model} returned empty content`);
        lastError = "Empty response from model";
        continue;
      }

      console.log(`✅ Success with model: ${model}`);

      const parsed = parseResponse(content);
      return parsed;

    } catch (err) {
      console.warn(`Model ${model} threw error:`, err.message);
      lastError = err.message;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}