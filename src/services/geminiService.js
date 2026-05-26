const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "deepseek/deepseek-r1-0528:free";

export async function summariseText(page1Text, page2Text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not found.");
  }

  const hasPage1 = page1Text && page1Text.trim().length > 10;
  const hasPage2 = page2Text && page2Text.trim().length > 10;

  // Get page summaries separately
  const getSummary = async (text, pageNum) => {
    if (!text || text.trim().length < 10) return "No content available for this page.";
    
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
            role: "user",
            content: `Write a 60 word summary of this text. Only write the summary, nothing else:\n\n${text}`
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });
    
    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || text.slice(0, 150) + "...";
  };

  const getConclusion = async (text1, text2) => {
    const combined = [text1, text2].filter(Boolean).join("\n\n");
    if (!combined || combined.trim().length < 10) return "No content available.";
    
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
            role: "user",
            content: `Write a 70 word conclusion about this document content. The conclusion must be about the topic of the document. Only write the conclusion paragraph, nothing else:\n\n${combined}`
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
    });
    
    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content?.trim();
    
    // Final safety check
    const bad = ["document processed", "summarised", "summarized", "extracted text"];
    const isBad = bad.some(p => result?.toLowerCase().includes(p));
    
    if (isBad || !result) {
      return combined.split(/\s+/).slice(0, 70).join(" ") + "...";
    }
    return result;
  };

  const [page1Summary, page2Summary, overallConclusion] = await Promise.all([
    getSummary(page1Text, 1),
    getSummary(page2Text, 2),
    getConclusion(page1Text, page2Text),
  ]);

  return { page1Summary, page2Summary, overallConclusion };
}