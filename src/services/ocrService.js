// src/services/ocrService.js
import Tesseract from "tesseract.js";

/**
 * Runs OCR on a File or Blob and returns cleaned extracted text.
 */
export async function runOCR(source) {
  try {
    const worker = await Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Better OCR settings for document scanning
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,        // auto page layout detection
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?;:'\"-()/ &@#%+=[]{}<>\\|_~`^",
      preserve_interword_spaces: "1",
    });

    const { data } = await worker.recognize(source);
    await worker.terminate();

    return cleanOCRText(data.text);
  } catch (err) {
    console.error("OCR error:", err);
    throw new Error("OCR failed: " + (err.message || "Unknown error"));
  }
}

/**
 * Deep clean OCR output — remove noise, fix spacing, keep meaningful text
 */
function cleanOCRText(raw) {
  if (!raw) return "";

  return raw
    // Remove non-printable / weird unicode characters
    .replace(/[^\x20-\x7E\n\r]/g, " ")

    // Remove standalone single characters that are OCR noise (e.g. "h", "3", "™")
    .replace(/(?<!\w)[^a-zA-Z0-9\s.,!?;:()\-'"/]{1,2}(?!\w)/g, " ")

    // Remove lines that are only symbols or numbers with no real words
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return false;

      // Keep line only if it has at least 2 real words (letters)
      const words = trimmed.match(/[a-zA-Z]{2,}/g);
      return words && words.length >= 1;
    })
    .join("\n")

    // Fix multiple spaces
    .replace(/[ \t]{2,}/g, " ")

    // Fix more than 2 consecutive newlines
    .replace(/\n{3,}/g, "\n\n")

    .trim();
}