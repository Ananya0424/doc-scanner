import * as pdfjsLib from 'pdfjs-dist'

// ✅ pdfjs-dist v5 worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Extracts text from a PDF file (all pages combined).
 * @param {File} file - PDF File object
 * @returns {Promise<{ text: string, pageCount: number }>}
 */
export async function extractTextFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pageCount = pdf.numPages

    let fullText = ''

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item) => item.str).join(' ')
      fullText += `\n--- Page ${i} ---\n${pageText}`
    }

    return { text: fullText.trim(), pageCount }

  } catch (error) {
    throw new Error(`PDF extraction failed: ${error.message}`)
  }
}

/**
 * Renders a specific PDF page to a canvas and returns it as a data URL.
 * Used when PDF has no selectable text (scanned PDF → needs OCR).
 * @param {File} file
 * @param {number} pageNumber - 1-based
 * @returns {Promise<string>} dataURL of the rendered page image
 */
export async function renderPDFPageToImage(file, pageNumber = 1) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(pageNumber)

    const viewport = page.getViewport({ scale: 2.0 }) // scale=2 for better OCR quality
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise

    return canvas.toDataURL('image/jpeg', 0.95)

  } catch (error) {
    throw new Error(`PDF render failed: ${error.message}`)
  }
}