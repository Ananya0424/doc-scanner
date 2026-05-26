// src/services/ocrService.js
import Tesseract from "tesseract.js";
import { ERRORS } from "../utils/errorMessages";

export async function runOCR(imageSource) {
  let result;

  try {
    result = await Tesseract.recognize(imageSource, "eng", {
      logger: () => {},
    });
  } catch (err) {
    throw new Error(ERRORS.OCR_FAILED);
  }

  const text = result?.data?.text?.trim() || "";
  const confidence = result?.data?.confidence || 0;
  const words = result?.data?.words || [];

  // ✅ FIX 1: Confidence bahut kam hai — image/selfie/blurry
  if (confidence < 50) {
    return "";
  }

  // ✅ FIX 2: Words count kam hai — real document mein kam se kam 5 words hote hain
  if (words.length < 5) {
    return "";
  }

  // ✅ FIX 3: High confidence words ka ratio check karo
  // Real text mein zyada words high confidence ke saath aate hain
  const highConfidenceWords = words.filter(w => w.confidence > 60);
  const ratio = highConfidenceWords.length / words.length;

  if (ratio < 0.5) {
    return ""; // Zyada garbage characters hain real text se
  }

  // ✅ FIX 4: Text mein actual readable words hone chahiye
  // Regex: kam se kam 3 letter wale real words
  const realWords = text.match(/\b[a-zA-Z]{3,}\b/g) || [];
  if (realWords.length < 3) {
    return ""; // Sirf symbols/numbers/garbage hai
  }

  return text;
}