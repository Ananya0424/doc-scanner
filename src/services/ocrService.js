// src/services/ocrService.js
import Tesseract from "tesseract.js";
import { ERRORS } from "../utils/errorMessages";

/**
 * Runs OCR on an image File or Blob.
 * Throws descriptive errors for empty/blurry results.
 */
export async function runOCR(imageSource) {
  let result;

  try {
    result = await Tesseract.recognize(imageSource, "eng", {
      logger: () => {}, // suppress verbose logs
    });
  } catch (err) {
    throw new Error(ERRORS.OCR_FAILED);
  }

  const text = result?.data?.text?.trim() || "";
  const confidence = result?.data?.confidence || 0;

  // Empty result
  if (!text || text.length < 5) {
    throw new Error(ERRORS.OCR_EMPTY);
  }

  // Low confidence = likely blurry or noisy scan
  if (confidence < 30) {
    throw new Error(ERRORS.OCR_BLURRY);
  }

  return text;
}