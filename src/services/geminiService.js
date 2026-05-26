// src/services/geminiService.js

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "deepseek/deepseek-v4-flash:free",
  "qwen/qwen3-coder:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildPrompt = (page1, page2) => `Summarise these two document pages.

PAGE 1 TEXT:
${page1.slice(0, 1500)}

PAGE 2 TEXT:
${page2.slice(0, 1500)}

Reply in this exact format:

Page 1 Summary:
[2-3 sentences about page 1]

Page 2 Summary:
[2-3 sentences about page 2]

Overall Conclusion:
[2-3 sentences conclusion]`;

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

export async function summariseText(page1Text, page2Text) {
  const prompt = buildPrompt(
    page1Text || "No text extracted from page 1.",
    page2Text || "No text extracted from page 2."
  );

  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];

    // Wait 2 seconds before each retry (except first attempt)
    if (i > 0) {
      console.log(`Waiting 2s before trying next model...`);
      await sleep(2000);
    }

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
          messages: [
            {
              role: "system",
              content: "You are a helpful document summariser. Always follow the exact format requested.",
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

      // Handle 429 specifically — wait longer and retry same model once
      if (response.status === 429) {
        console.warn(`Model ${model} rate limited (429), waiting 5s...`);
        await sleep(5000);

        const retry = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": window.location.origin,
            "X-Title": "Document Scanner Summariser",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a helpful document summariser. Always follow the exact format requested." },
              { role: "user", content: prompt },
            ],
            max_tokens: 600,
            temperature: 0.3,
          }),
        });

        if (!retry.ok) {
          const errBody = await retry.json().catch(() => ({}));
          lastError = errBody?.error?.message || `HTTP ${retry.status}`;
          console.warn(`Retry also failed for ${model}: ${lastError}`);
          continue;
        }

        const retryData = await retry.json();
        const retryContent = retryData?.choices?.[0]?.message?.content;
        if (retryContent) {
          console.log(`✅ Retry success with model: ${model}`);
          return parseResponse(retryContent);
        }
        continue;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const reason = errBody?.error?.message || `HTTP ${response.status}`;
        console.warn(`Model ${model} failed: ${reason}`);
        lastError = reason;
        continue;
      }

      const data = await response.json();
      console.log("Full response:", JSON.stringify(data));

      const content = data?.choices?.[0]?.message?.content;

      if (!content || content.trim() === "") {
        console.warn(`Model ${model} returned empty content`);
        lastError = "Empty response from model";
        continue;
      }

      console.log(`✅ Success with model: ${model}`);
      return parseResponse(content);

    } catch (err) {
      console.warn(`Model ${model} threw error:`, err.message);
      lastError = err.message;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}