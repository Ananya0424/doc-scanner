// src/services/pdfService.js
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/**
 * Extracts clean text from a PDF File (up to 2 pages).
 * - Tries native PDF text layer first (digital PDFs)
 * - Falls back to OCR if page is scanned / image-based
 */
export async function extractTextFromPDF(file, runOCR, setStatus = () => {}) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = Math.min(pdf.numPages, 2);
  const results = [];

  for (let i = 1; i <= totalPages; i++) {
    setStatus(`Extracting text from page ${i} of ${totalPages}...`);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items into lines based on Y position
    const lineMap = {};
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push({ x: item.transform[4], text: item.str });
    }

    // Sort lines top to bottom, words left to right
    const sortedYs = Object.keys(lineMap)
      .map(Number)
      .sort((a, b) => b - a);

    let extractedText = "";
    for (const y of sortedYs) {
      const line = lineMap[y]
        .sort((a, b) => a.x - b.x)
        .map((w) => w.text)
        .join(" ")
        .trim();
      if (line.length > 0) extractedText += line + "\n";
    }

    const cleaned = cleanPDFText(extractedText);

    // If very little text extracted — scanned PDF, use OCR
    if (cleaned.replace(/\s/g, "").length < 50 && runOCR) {
      setStatus(`Page ${i} appears scanned — running OCR...`);
      const ocrText = await ocrPDFPage(page, runOCR);
      results.push(ocrText);
    } else {
      results.push(cleaned);
    }
  }

  return {
    page1: results[0] || "",
    page2: results[1] || "",
  };
}

/**
 * Renders a PDF page to canvas at high resolution, then OCRs it
 */
async function ocrPDFPage(page, runOCR) {
  // Scale 2.5 = high resolution = better OCR accuracy
  const vp = page.getViewport({ scale: 2.5 });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;

  const ctx = canvas.getContext("2d");

  // White background — helps OCR with transparent PDFs
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  return new Promise((resolve) => {
    canvas.toBlob(
      async (blob) => {
        try {
          const text = await runOCR(blob);
          resolve(text || "");
        } catch {
          resolve("");
        }
      },
      "image/jpeg",
      0.95  // high quality = better OCR
    );
  });
}

/**
 * Clean PDF extracted text — remove noise, fix structure
 */
function cleanPDFText(raw) {
  if (!raw) return "";

  return raw
    // Remove non-ASCII characters
    .replace(/[^\x20-\x7E\n\r]/g, " ")

    // Remove lines with only symbols / numbers (no real words)
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return false;
      const words = trimmed.match(/[a-zA-Z]{2,}/g);
      return words && words.length >= 1;
    })
    .join("\n")

    // Fix multiple spaces
    .replace(/[ \t]{2,}/g, " ")

    // Fix excessive newlines
    .replace(/\n{3,}/g, "\n\n")

    .trim();
}