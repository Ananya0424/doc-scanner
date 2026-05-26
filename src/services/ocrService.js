// src/services/ocrService.js
import { createWorker } from 'tesseract.js'

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
 * Smart preprocessing:
 * 1. Deskew detection hint (via upscaling)
 * 2. Grayscale conversion
 * 3. Adaptive thresholding — handles uneven lighting & shadows
 * 4. Noise removal via median-like filter
 */
async function preprocessForOCR(source) {
  return new Promise(async (resolve) => {
    try {
      const dataUrl = await toDataURL(source)
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width * 2
        canvas.height = img.height * 2
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        const width = canvas.width
        const height = canvas.height

        // Step 1: Convert to grayscale
        const gray = new Uint8Array(width * height)
        for (let i = 0; i < data.length; i += 4) {
          gray[i / 4] = Math.round(
            0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          )
        }

        // Step 2: Adaptive thresholding
        // For each pixel, compare to LOCAL average in a window around it
        // This handles shadows, uneven lighting, camera angle issues
        const blockSize = 41  // neighborhood size (must be odd)
        const C = 10          // constant subtracted from mean
        const half = Math.floor(blockSize / 2)

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            // Calculate local mean
            let sum = 0, count = 0
            for (let dy = -half; dy <= half; dy++) {
              for (let dx = -half; dx <= half; dx++) {
                const ny = y + dy, nx = x + dx
                if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                  sum += gray[ny * width + nx]
                  count++
                }
              }
            }
            const localMean = sum / count
            const pixelIdx = (y * width + x) * 4
            // If pixel is darker than local mean - C → it's text (black)
            const binaryVal = gray[y * width + x] < localMean - C ? 0 : 255
            data[pixelIdx] = binaryVal
            data[pixelIdx + 1] = binaryVal
            data[pixelIdx + 2] = binaryVal
          }
        }

        ctx.putImageData(imageData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }

      img.onerror = async () => resolve(await toDataURL(source))
      img.src = dataUrl
    } catch {
      resolve(source)
    }
  })
}

export async function runOCR(source) {
  let worker = null
  try {
    const processedImage = await preprocessForOCR(source)

    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    await worker.setParameters({
      tessedit_pageseg_mode: '1',
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

function cleanOCRText(raw) {
  if (!raw) return ''

  return raw
    .replace(/[^\x20-\x7E\n\r]/g, ' ')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (trimmed.length === 0) return false
      const words = trimmed.match(/[a-zA-Z]{2,}/g)
      return words && words.length >= 1
    })
    .map(line => line
      .replace(/[^a-zA-Z0-9\s.,!?;:()\-'"\/&@#+=%]/g, ' ')
      .replace(/\b[a-zA-Z0-9]\b/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
    )
    .filter(line => line.length > 3)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}