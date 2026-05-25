// src/utils/wordCount.js

/**
 * Count words in a string
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Build the full plain-text summary for copying
 * @param {{ page1Summary, page2Summary, conclusion }} summary
 * @returns {string}
 */
export function buildCopyText(summary) {
  return `
📄 PAGE 1 SUMMARY
${summary.page1Summary || "N/A"}

📄 PAGE 2 SUMMARY
${summary.page2Summary || "N/A"}

🎯 OVERALL CONCLUSION
${summary.conclusion || "N/A"}
`.trim();
}