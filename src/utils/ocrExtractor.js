import { createWorker } from 'tesseract.js'

/**
 * Extracts text from a single image using Tesseract OCR.
 * Compatible with tesseract.js v5.x
 * @param {File | Blob | string} imageSource - File object or dataURL string
 * @param {Function} onProgress - callback(progress: 0–100)
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export async function extractTextFromImage(imageSource, onProgress = null) {
  let worker = null

  try {
    // ✅ v5 API: createWorker(lang, oem, options)
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          const progress = Math.round(m.progress * 100)
          onProgress(progress)
        }
      },
    })

    const { data } = await worker.recognize(imageSource)
    const text = data.text.trim()
    const confidence = data.confidence

    if (confidence < 20 && text.length < 10) {
      throw new Error(
        `OCR confidence too low (${Math.round(confidence)}%). ` +
        `Image may be blurry or have poor lighting. Please retake or re-upload.`
      )
    }

    return { text, confidence }

  } catch (error) {
    if (error.message.includes('OCR confidence')) throw error
    throw new Error(`OCR failed: ${error.message}`)

  } finally {
    // ✅ Always terminate worker — prevents memory leaks
    if (worker) await worker.terminate()
  }
}

/**
 * Extracts text from multiple pages sequentially.
 * @param {Array<File | Blob | string>} images
 * @param {Function} onProgress - callback({ page, progress })
 * @returns {Promise<Array<{ page: number, text: string, confidence: number }>>}
 */
export async function extractTextFromPages(images, onProgress = null) {
  const results = []

  for (let i = 0; i < images.length; i++) {
    const pageNumber = i + 1

    const { text, confidence } = await extractTextFromImage(
      images[i],
      (progress) => {
        if (onProgress) onProgress({ page: pageNumber, progress })
      }
    )

    results.push({ page: pageNumber, text, confidence })
  }

  return results
}