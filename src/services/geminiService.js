cat > src/services/geminiService.js << 'EOF'
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

// ✅ Local fallback — extracted text se real summary banata hai
function generateLocalSummary(page1Text, page2Text) {
  const summarise = (text, limit = 120) => {
    if (!text || text.trim().length < 10) return "Is page mein koi readable text nahi mila.";
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let result = "";
    for (const s of sentences) {
      if ((result + s).length > limit) break;
      result += s.trim() + " ";
    }
    return result.trim() || text.substring(0, limit) + "...";
  };

  const p1 = summarise(page1Text, 300);
  const p2 = summarise(page2Text, 300);

  // Conclusion = dono pages ke first sentences combine karo
  const getFirstLine = (text) => {
    if (!text || text.trim().length < 10) return "";
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 2).join(" ").trim();
  };

  const c1 = getFirstLine(page1Text);
  const c2 = getFirstLine(page2Text);

  let conclusion = "";
  if (c1 && c2) {
    conclusion = `${c1} ${c2} Dono pages mil kar document ka ek complete overview dete hain jisme topic ke mukhya points covered hain.`;
  } else if (c1) {
    conclusion = `${c1} Yeh document ek important topic ko cover karta hai jiska summary page 1 mein diya gaya hai.`;
  } else if (c2) {
    conclusion = `${c2} Yeh document ek important topic ko cover karta hai jiska summary page 2 mein diya gaya hai.`;
  } else {
    conclusion = "Document ke dono pages se text extract hua hai. Detailed summary ke liye API connection ki zaroorat hai.";
  }

  return { page1Summary: p1, page2Summary: p2, conclusion };
}

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
          content: "You are a strict document summariser. ONLY summarise the document text provided. NEVER write generic phrases. Always respond with ONLY raw JSON.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.2,
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

export async function summariseWithGemini(page1Text, page2Text, extraText = "") {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("API key missing.");

  const p1 = page1Text?.trim() || "No text available.";
  const p2 = page2Text?.trim() || "No text available.";
  const extra = extraText?.trim() ? `\n\nADDITIONAL PAGES:\n${extraText.trim()}` : "";

  const prompt = `Read these document pages and summarise them.

=== PAGE 1 ===
${p1}

=== PAGE 2 ===
${p2}${extra}

Respond with ONLY this JSON:
{"page1Summary":"50-70 words summarising page 1 content","page2Summary":"50-70 words summarising page 2 content","conclusion":"60-80 words combining main message of both pages"}`;

  let lastError = null;

  for (let i = 0; i < MODELS.length; i++) {
    try {
      console.log(`Trying: ${MODELS[i]}`);
      const rawText = await tryModel(MODELS[i], prompt, apiKey);

      let clean = rawText
        .replace(/```json/gi, "")
        .replace(/```/gi, "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.page1Summary || !parsed.page2Summary || !parsed.conclusion) {
        throw new Error("Missing keys");
      }

      console.log(`Success: ${MODELS[i]}`);
      return parsed;

    } catch (err) {
      console.log(err.message === "RATE_LIMITED"
        ? `Rate limited: ${MODELS[i]}`
        : `Failed (${MODELS[i]}): ${err.message}`);
      lastError = err;
      if (i < MODELS.length - 1) await delay(800);
    }
  }

  
  console.log("All API models busy — generating local summary from extracted text");
  return generateLocalSummary(page1Text, page2Text);
}
EOF