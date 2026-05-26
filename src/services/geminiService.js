// src/services/geminiService.js
// OpenRouter with built-in fallback chain

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const buildPrompt = (page1, page2) => `You are a document summariser.

PAGE 1:
${page1.slice(0, 1000)}

PAGE 2:
${page2.slice(0, 1000)}

Reply in EXACTLY this format:
Page 1 Summary:
[2-3 sentences]

Page 2 Summary:
[2-3 sentences]

Overall Conclusion:
[2-3 sentences]`;

function parseResponse(text) {
  const page1Match = text.match(/Page 1 Summary:\s*([\s\S]*?)(?=Page 2 Summary:|$)/i);
  const page2Match = text.match(/Page 2 Summary:\s*([\s\S]*?)(?=Overall Conclusion:|$)/i);
  const conclusionMatch = text.match(/Overall Conclusion:\s*([\s\S]*?)$/i);

  return {
    page1Summary: page1Match?.[1]?.trim() || "No summary for page 1.",
    page2Summary: page2Match?.[1]?.trim() || "No summary for page 2.",
    overallConclusion: conclusionMatch?.[1]?.trim() || "No conclusion available.",
  };
}

// ── Local fallback — no API needed, always works ──
function localFallback(page1Text, page2Text) {
  console.log("⚠️ Using local fallback");

  const summarise = (text) => {
    if (!text || text.trim().length < 20) return "No readable text found on this page.";
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const top = sentences.slice(0, 3).join(" ").trim();
    return top || text.slice(0, 200).trim() + "...";
  };

  return {
    page1Summary: summarise(page1Text),
    page2Summary: summarise(page2Text),
    overallConclusion:
      "Document processed successfully. AI summarisation is temporarily unavailable due to rate limits. " +
      "The extracted text above contains the full content from both pages.",
    isFallback: true,
  };
}

export async function summariseText(page1Text, page2Text) {
  const prompt = buildPrompt(
    page1Text || "No text on page 1.",
    page2Text || "No text on page 2."
  );

  try {
    console.log("Calling OpenRouter with fallback chain...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Document Scanner Summariser",
      },
      body: JSON.stringify({
        // Primary model
        model: "meta-llama/llama-3.3-70b-instruct:free",

        // ✅ OpenRouter built-in fallbacks — tries each one automatically
        models: [
          "meta-llama/llama-3.3-70b-instruct:free",
          "google/gemma-4-31b-it:free",
          "deepseek/deepseek-v4-flash:free",
          "nousresearch/hermes-3-llama-3.1-405b:free",
          "meta-llama/llama-3.2-3b-instruct:free",
          "qwen/qwen3-coder:free",
        ],

        // ✅ Route to any available provider automatically
        route: "fallback",

        messages: [
          {
            role: "system",
            content: "You are a helpful document summariser. Always follow the exact format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (response.status === 429) {
      console.warn("OpenRouter rate limited — using local fallback");
      return localFallback(page1Text, page2Text);
    }

    if (!response.ok) {
      console.warn(`OpenRouter error ${response.status} — using local fallback`);
      return localFallback(page1Text, page2Text);
    }

    const data = await response.json();
    console.log("Response:", JSON.stringify(data));

    const content = data?.choices?.[0]?.message?.content;

    if (!content?.trim()) {
      console.warn("Empty response — using local fallback");
      return localFallback(page1Text, page2Text);
    }

    console.log("✅ OpenRouter success!");
    return parseResponse(content);

  } catch (err) {
    console.warn("Network error — using local fallback:", err.message);
    return localFallback(page1Text, page2Text);
  }
}