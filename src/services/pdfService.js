// src/services/pdfService.js
import * as pdfjsLib from "pdfjs-dist";
import { ERRORS } from "../utils/errorMessages";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/**
 * Extracts text from a PDF File.
 * Falls back to OCR if pages have no selectable text.
 */
export async function extractTextFromPDF(file, runOCR, setStatus) {
  let pdf;

  try {
    const arrayBuffer = await file.arrayBuffer();
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    throw new Error(ERRORS.PDF_CORRUPT);
  }

  const totalPages = pdf.numPages;
  const results = { page1: "", page2: "" };

  for (let i = 1; i <= Math.min(totalPages, 2); i++) {
    const label = `page${i}`;
    setStatus?.(`Extracting Page ${i} of ${Math.min(totalPages, 2)}...`);

    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const rawText = textContent.items.map((item) => item.str).join(" ").trim();

      if (rawText.length > 10) {
        // Selectable text found
        results[label] = rawText;
      } else {
        // Scanned PDF — render to canvas and OCR it
        setStatus?.(`Page ${i} has no text — running OCR...`);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise((res) =>
          canvas.toBlob(res, "image/png")
        );

        try {
          results[label] = await runOCR(blob);
        } catch {
          results[label] = ""; // OCR failed for this page — continue
        }
      }
    } catch (err) {
      // Single page failure — don't crash entire extraction
      results[label] = "";
    }
  }

  // If both pages came back empty
  if (!results.page1 && !results.page2) {
    throw new Error(ERRORS.PDF_EMPTY);
  }

  return results;
}