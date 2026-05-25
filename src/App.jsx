// src/App.jsx
import { useState } from "react";
import FileUploader from "./components/FileUploader";
import CameraCapture from "./components/CameraCapture";
import { runOCR } from "./services/ocrService";
import { extractTextFromPDF } from "./services/pdfService";
import { summariseWithGemini } from "./services/geminiService";

export default function App() {
  const [mode, setMode] = useState("upload");
  const [pages, setPages] = useState([null, null]);
  const [extractedText, setExtractedText] = useState({ page1: "", page2: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summarising, setSummarising] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPDF = (source) =>
    source instanceof File && source.type === "application/pdf";
  const isImageFile = (source) =>
    source instanceof File && source.type.startsWith("image/");
  const isDataURL = (source) =>
    typeof source === "string" && source.startsWith("data:");

  const dataURLtoBlob = (dataURL) => {
    const [header, data] = dataURL.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  };

  const resetState = () => {
    setPages([null, null]);
    setError(null);
    setStatus("");
    setSummary(null);
    setExtractedText({ page1: "", page2: "" });
    setCopied(false);
  };

  const handleExtract = async () => {
    if (!pages[0]) {
      setError("Please upload or capture at least Page 1.");
      return;
    }
    setLoading(true);
    setError(null);
    setSummary(null);
    setExtractedText({ page1: "", page2: "" });

    try {
      let text1 = "";
      let text2 = "";

      if (isPDF(pages[0])) {
        setStatus("Extracting text from PDF...");
        const result = await extractTextFromPDF(pages[0], runOCR, setStatus);
        text1 = result.page1;
        text2 = result.page2;
      } else if (isImageFile(pages[0])) {
        setStatus("Running OCR on Page 1...");
        text1 = await runOCR(pages[0]);
      } else if (isDataURL(pages[0])) {
        setStatus("Running OCR on Page 1 (camera)...");
        text1 = await runOCR(dataURLtoBlob(pages[0]));
      }

      if (!isPDF(pages[0]) && pages[1]) {
        if (isImageFile(pages[1])) {
          setStatus("Running OCR on Page 2...");
          text2 = await runOCR(pages[1]);
        } else if (isDataURL(pages[1])) {
          setStatus("Running OCR on Page 2 (camera)...");
          text2 = await runOCR(dataURLtoBlob(pages[1]));
        }
      }

      setExtractedText({ page1: text1, page2: text2 });
      setStatus("✅ Text extraction complete!");
    } catch (err) {
      setError(err.message || "Extraction failed. Please try again.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarise = async () => {
    if (!extractedText.page1 && !extractedText.page2) {
      setError("Please extract text first before summarising.");
      return;
    }
    setSummarising(true);
    setError(null);
    setSummary(null);

    try {
      setStatus("Sending text to Gemini AI...");
      const result = await summariseWithGemini(
        extractedText.page1,
        extractedText.page2
      );
      setSummary(result);
      setStatus("✅ Summarisation complete!");
    } catch (err) {
      setError(err.message || "Summarisation failed. Please try again.");
      setStatus("");
    } finally {
      setSummarising(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = `PAGE 1 SUMMARY:\n${summary.page1Summary}\n\nPAGE 2 SUMMARY:\n${summary.page2Summary}\n\nOVERALL CONCLUSION:\n${summary.conclusion}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const wordCount = summary
    ? [summary.page1Summary, summary.page2Summary, summary.conclusion]
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length
    : 0;

  const hasPages = pages[0] || pages[1];

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-2">
          📄 Document Scanner & Summariser
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Upload or capture documents to extract and summarise content
        </p>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => { setMode("upload"); resetState(); }}
            className={`px-5 py-2 rounded-full font-medium transition ${
              mode === "upload"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            📁 Upload Files
          </button>
          <button
            onClick={() => { setMode("camera"); resetState(); }}
            className={`px-5 py-2 rounded-full font-medium transition ${
              mode === "camera"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            📷 Camera Capture
          </button>
        </div>

        {/* Input Component */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          {mode === "upload" ? (
            <FileUploader pages={pages} setPages={setPages} setError={setError} />
          ) : (
            <CameraCapture pages={pages} setPages={setPages} setError={setError} />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Status */}
        {status && (
          <p className="text-center text-indigo-500 text-sm mb-4 animate-pulse">
            {status}
          </p>
        )}

        {/* Extract Button */}
        {hasPages && (
          <div className="flex justify-center mb-6">
            <button
              onClick={handleExtract}
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold
                         hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "⏳ Extracting..." : "🔍 Extract Text"}
            </button>
          </div>
        )}

        {/* Extracted Text Preview */}
        {(extractedText.page1 || extractedText.page2) && (
          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-700">📋 Extracted Text</h2>
            {extractedText.page1 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-600 mb-2 text-sm uppercase tracking-wide">
                  Page 1
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {extractedText.page1}
                </p>
              </div>
            )}
            {extractedText.page2 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-600 mb-2 text-sm uppercase tracking-wide">
                  Page 2
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {extractedText.page2}
                </p>
              </div>
            )}

            {/* Summarise Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSummarise}
                disabled={summarising}
                className="px-8 py-3 bg-purple-600 text-white rounded-xl font-semibold
                           hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {summarising ? "⏳ Summarising..." : "✨ Summarise with Gemini"}
              </button>
            </div>
          </div>
        )}

        {/* Summary Output */}
        {summary && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-700">✨ AI Summary</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  {wordCount} words
                </span>
                <button
                  onClick={handleCopy}
                  className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full
                             hover:bg-indigo-200 transition font-medium"
                >
                  {copied ? "✅ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <h3 className="font-semibold text-indigo-700 mb-2 text-sm uppercase tracking-wide">
                📄 Page 1 Summary
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{summary.page1Summary}</p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h3 className="font-semibold text-purple-700 mb-2 text-sm uppercase tracking-wide">
                📄 Page 2 Summary
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{summary.page2Summary}</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="font-semibold text-emerald-700 mb-2 text-sm uppercase tracking-wide">
                🎯 Overall Conclusion
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{summary.conclusion}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}