// src/utils/errorMessages.js

export const ERRORS = {
  // File Upload
  INVALID_FILE_TYPE: "❌ Invalid file type. Please upload a PDF, PNG, or JPG file.",
  FILE_TOO_LARGE: "❌ File is too large. Maximum allowed size is 10MB.",
  NO_PAGE_1: "⚠️ Please upload or capture at least Page 1 before extracting.",

  // OCR
  OCR_EMPTY: "⚠️ No text could be extracted. The image may be blank or too noisy.",
  OCR_BLURRY: "⚠️ Image appears blurry. Please retake or upload a clearer photo.",
  OCR_FAILED: "❌ OCR failed. Please try a clearer image.",

  // PDF
  PDF_CORRUPT: "❌ Could not read this PDF. It may be corrupted or password-protected.",
  PDF_EMPTY: "⚠️ No text found in PDF. It may be a scanned image-only PDF.",

  // Camera
  CAMERA_DENIED: "❌ Camera access denied. Please allow camera permissions in your browser settings.",
  CAMERA_NOT_SUPPORTED: "❌ Camera not supported on this device or browser.",
  CAMERA_FAILED: "❌ Could not start camera. Please check your device.",

  // Gemini
  GEMINI_KEY_MISSING: "❌ Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file.",
  GEMINI_NETWORK: "❌ Network error — could not reach Gemini API. Check your internet connection.",
  GEMINI_EMPTY: "❌ Gemini returned an empty response. Please try again.",
  GEMINI_FAILED: "❌ Summarisation failed. Please try again.",

  // General
  NO_TEXT_TO_SUMMARISE: "⚠️ Please extract text first before summarising.",
};