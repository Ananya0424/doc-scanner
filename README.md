# 📄 DocScan AI — Document Scanner & Summariser

> Upload or capture any two-page document and get an AI-powered structured summary instantly.

---

## 🌐 Live Demo

🔗 https://doc-scanner-o35yaphnh-ananya0424s-projects.vercel.app/

---

## 🎯 Project Overview

DocScan AI is a web application built as part of an internship task. It allows users to:

- Upload a PDF or image document (JPG/PNG)
- Capture pages live using the device camera
- Extract text using OCR or PDF parsing
- Generate a clean AI summary with page-wise breakdown and overall conclusion

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 📁 File Upload | Drag & drop PDF or JPG/PNG images |
| 📷 Camera Capture | Live camera scan with retake option |
| 🔍 Text Extraction | PDF.js for PDFs, Tesseract.js OCR for images |
| 🤖 AI Summarisation | Page 1 summary, Page 2 summary, Overall conclusion |
| 📋 Copy to Clipboard | One-click copy of full summary |
| 📊 Word Count | Live word count of generated summary |
| 🔄 Fallback System | Smart local fallback if AI rate limited |
| 📱 Responsive | Works on mobile and desktop |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| PDF Parsing | PDF.js |
| OCR | Tesseract.js |
| AI Summarisation | OpenRouter API (DeepSeek R1 free model) |
| Deployment | Vercel / Netlify |

---

## 🚀 How to Run Locally

### 1. Clone the project
```bash
git clone https://github.com/your-username/docscan-ai.git
cd docscan-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create `.env` file
```bash
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
```

> Get your free API key at 👉 **https://openrouter.ai**

### 4. Start the dev server
```bash
npm run dev
```

### 5. Open in browser
```
http://localhost:5173
```

---

## 📁 Project Structure

```
docscan-ai/
├── public/
├── src/
│   ├── components/
│   │   ├── FileUploader.jsx       # Drag-drop file upload with thumbnails
│   │   └── CameraCapture.jsx      # Live camera capture with retake
│   ├── services/
│   │   ├── ocrService.js          # Tesseract.js OCR for images
│   │   ├── pdfService.js          # PDF.js text extraction
│   │   └── geminiService.js       # OpenRouter AI summarisation
│   ├── App.jsx                    # Main dashboard with 4-step pipeline
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Tailwind CSS
├── .env                           # API keys (never commit this!)
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## 🔄 How It Works

```
Step 1 — INPUT
User uploads PDF/images OR captures via camera
           ↓
Step 2 — EXTRACT
PDF.js extracts text from PDFs
Tesseract.js runs OCR on images/camera captures
           ↓
Step 3 — SUMMARISE
Extracted text sent to OpenRouter AI (DeepSeek model)
Returns: Page 1 summary + Page 2 summary + Overall conclusion
           ↓
Step 4 — RESULT
Clean structured summary displayed on screen
Word count shown + Copy to clipboard button
```

---

## ⚙️ How AI Summarisation Works

1. Page 1 text is sent to AI → returns 2-3 sentence summary
2. Page 2 text is sent to AI → returns 2-3 sentence summary
3. Both summaries are sent → AI returns overall conclusion
4. If API is rate limited → smart local fallback builds summary from actual text

---

## 📊 Evaluation Criteria Met

| Criteria | Status |
|----------|--------|
| Camera capture — both pages | ✅ Done |
| File upload — PDF and images | ✅ Done |
| Text extraction with minimal noise | ✅ Done |
| Summary — 150-250 words, page-wise | ✅ Done |
| On-screen display, no download needed | ✅ Done |
| Copy to clipboard button | ✅ Done |
| Error handling for blurry/corrupt files | ✅ Done |
| Retake option in camera mode | ✅ Done |

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key for AI summarisation |

> ⚠️ Never push your `.env` file to GitHub. It is already in `.gitignore`.

---

## 📦 Deployment

### Deploy on Vercel
```bash
npm run build
# Push to GitHub → Connect repo on vercel.com → Add env variable → Deploy
```

### Deploy on Netlify
```bash
npm run build
# Drag the dist/ folder to netlify.com/drop
```

---

## 🐛 Known Issues & Fixes

| Issue | Fix |
|-------|-----|
| Rate limit from OpenRouter free models | Retry logic with delay — auto handles |
| Camera not working | Allow camera permission in browser |
| PDF with no text layer | Auto falls back to OCR |
| Tailwind not loading | Check `postcss.config.js` exists |

---

## 👩‍💻 Developer

**Ananya Sharma** — ananyasharma242004@gmail.com
---

## 📄 License

This project was built for internship evaluation purposes.
