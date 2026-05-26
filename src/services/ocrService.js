// src/services/ocrService.js
import { createWorker } from 'tesseract.js'

/**
 * Converts File/Blob to dataURL
 */
function toDataURL(source) {
  return new Promise((resolve, reject) => {
    if (typeof source === 'string') return resolve(source)
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(source)
  })
}

/**
 * Advanced image preprocessing for document OCR:
 * - Converts to grayscale
 * - Applies aggressive thresholding (binarization)
 * - This turns stamps/watermarks/logos into white background
 *   and keeps only dark printed text as black
 */
async function preprocessForOCR(source) {
  return new Promise(async (resolve) => {
    try {
      const dataUrl = await toDataURL(source)
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        // Scale up 2x for better OCR accuracy
        canvas.width = img.width * 2
        canvas.height = img.height * 2
        const ctx = canvas.getContext('2d')

        // Use better image rendering
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]

          // Step 1: Grayscale using luminance
          const gray = 0.299 * r + 0.587 * g + 0.114 * b

          // Step 2: Hard threshold binarization
          // Pixels darker than 140 → pure black (text)
          // Pixels lighter than 140 → pure white (background, removes watermarks)
          const binary = gray < 140 ? 0 : 255

          data[i] = binary
          data[i + 1] = binary
          data[i + 2] = binary
          // Alpha stays 255
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))  // PNG for lossless quality
      }

      img.onerror = async () => resolve(await toDataURL(source))
      img.src = dataUrl

    } catch {
      resolve(await toDataURL(source).catch(() => source))
    }
  })
}

/**
 * Runs OCR on a File, Blob, or dataURL
 */
export async function runOCR(source) {
  let worker = null

  try {
    // Preprocess first — removes watermarks/stamps/noise
    const processedImage = await preprocessForOCR(source)

    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    await worker.setParameters({
      tessedit_pageseg_mode: '1',         // Auto page segmentation
      preserve_interword_spaces: '1',
    })

    const { data } = await worker.recognize(processedImage)
    return cleanOCRText(data.text)

  } catch (err) {
    console.error('OCR error:', err)
    throw new Error('OCR failed: ' + (err.message || 'Unknown error'))
  } finally {
    if (worker) await worker.terminate()
  }
}

/**
 * Deep cleans OCR output
 */
function cleanOCRText(raw) {
  if (!raw) return ''

  return raw
    // Remove non-ASCII / unicode noise
    .replace(/[^\x20-\x7E\n\r]/g, ' ')

    // Remove lines with no real words
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.length === 0) return false
      const words = trimmed.match(/[a-zA-Z]{2,}/g)
      return words && words.length >= 1
    })

    // Clean each line
    .map(line => line
      .replace(/[^a-zA-Z0-9\s.,!?;:()\-'"\/&@#+=%]/g, ' ')  // keep only useful chars
      .replace(/\b[a-zA-Z0-9]\b/g, ' ')    // remove isolated single chars (noise)
      .replace(/[ \t]{2,}/g, ' ')           // collapse spaces
      .trim()
    )
    .filter(line => line.length > 3)        // drop very short lines

    .join('\n')
    .replace(/\n{3,}/g, '\n\n')            // max 2 consecutive newlines
    .trim()
}