// src/services/ocrService.js
import { createWorker } from 'tesseract.js'   // ✅ Named import — v5 correct syntax

/**
 * Runs OCR on a File, Blob, or dataURL and returns cleaned extracted text.
 */
export async function runOCR(source) {
  let worker = null

  try {
    // ✅ v5 API: createWorker(lang, oem, options)
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    // ✅ PSM via setParameters using string value — no Tesseract.PSM needed
    await worker.setParameters({
      tessedit_pageseg_mode: '1',          // AUTO = mode 1
      preserve_interword_spaces: '1',
    })

    const { data } = await worker.recognize(source)
    return cleanOCRText(data.text)

  } catch (err) {
    console.error('OCR error:', err)
    throw new Error('OCR failed: ' + (err.message || 'Unknown error'))

  } finally {
    if (worker) await worker.terminate()   // ✅ Always clean up
  }
}

/**
 * Deep clean OCR output — remove noise, fix spacing, keep meaningful text
 */
function cleanOCRText(raw) {
  if (!raw) return ''

  return raw
    // Remove non-printable / weird unicode characters
    .replace(/[^\x20-\x7E\n\r]/g, ' ')

    // Remove lines that are only symbols or numbers with no real words
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.length === 0) return false
      // Keep line only if it has at least 1 real word (2+ letters)
      const words = trimmed.match(/[a-zA-Z]{2,}/g)
      return words && words.length >= 1
    })
    .join('\n')

    // Fix multiple spaces
    .replace(/[ \t]{2,}/g, ' ')

    // Fix more than 2 consecutive newlines
    .replace(/\n{3,}/g, '\n\n')

    .trim()
}