// src/App.jsx
import { useState } from "react";
import FileUploader from "./components/FileUploader";
import CameraCapture from "./components/CameraCapture";
import { runOCR } from "./services/ocrService";
import { extractTextFromPDF } from "./services/pdfService";
import { summariseText } from "./services/geminiService";

export default function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [mode, setMode] = useState("upload");
  const [pages, setPages] = useState([null, null]);
  const [extractedText, setExtractedText] = useState({ page1: "", page2: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summarising, setSummarising] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPDF = (source) => source instanceof File && source.type === "application/pdf";
  const isImageFile = (source) => source instanceof File && source.type.startsWith("image/");
  const isDataURL = (source) => typeof source === "string" && source.startsWith("data:");

  const dataURLtoBlob = (dataURL) => {
    const [header, data] = dataURL.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  };

  const resetAll = () => {
    setPages([null, null]);
    setExtractedText({ page1: "", page2: "" });
    setSummary(null);
    setError(null);
    setStatus("");
    setCopied(false);
    setCurrentPage(1);
  };

  const handleExtract = async () => {
    if (!pages[0]) {
      setError("Please upload or capture at least Page 1.");
      return;
    }
    setLoading(true);
    setError(null);
    setExtractedText({ page1: "", page2: "" });

    try {
      let text1 = "", text2 = "";

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
      setStatus("Text extraction complete!");
      setCurrentPage(2);
    } catch (err) {
      setError(err.message || "Extraction failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSummarise = async () => {
    if (!extractedText.page1 && !extractedText.page2) {
      setError("No text found in any page. Please upload a document with readable text.");
      return;
    }
    setSummarising(true);
    setError(null);
    setSummary(null);

    try {
      setStatus("Sending to AI...");
      const result = await summariseText(extractedText.page1, extractedText.page2);
      setSummary(result);
      setStatus("Summarisation complete!");
      setCurrentPage(3);
    } catch (err) {
      setError(err.message || "Summarisation failed.");
    } finally {
      setSummarising(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    const text = `PAGE 1 SUMMARY:\n${summary.page1Summary}\n\nPAGE 2 SUMMARY:\n${summary.page2Summary}\n\nOVERALL CONCLUSION:\n${summary.overallConclusion}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const wordCount = summary
    ? [summary.page1Summary, summary.page2Summary, summary.overallConclusion]
        .join(" ").split(/\s+/).filter(Boolean).length
    : 0;

  const steps = [
    { number: 1, label: "Upload" },
    { number: 2, label: "Extract" },
    { number: 3, label: "Summary" },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">DS</span>
          </div>
          <span className="text-lg font-semibold text-gray-800">
            Document Scanner & Summariser
          </span>
        </div>
        <button
          onClick={resetAll}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
        >
          + New Scan
        </button>
      </nav>

      {/* STEP PROGRESS */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  currentPage > step.number
                    ? "bg-blue-600 text-white"
                    : currentPage === step.number
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : "bg-gray-100 text-gray-400"
                }`}>
                  {currentPage > step.number ? "✓" : step.number}
                </div>
                <span className={`text-sm font-medium ${
                  currentPage >= step.number ? "text-blue-600" : "text-gray-400"
                }`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${
                  currentPage > step.number ? "bg-blue-600" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* STEP 1 — UPLOAD */}
        {currentPage === 1 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
              <p className="text-gray-500 text-sm mt-1">
                Upload PDF or images, or capture using your camera
              </p>
            </div>

            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setMode("upload")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  mode === "upload"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Upload Files
              </button>
              <button
                onClick={() => setMode("camera")}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                  mode === "camera"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Camera Capture
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
              {mode === "upload" ? (
                <FileUploader pages={pages} setPages={setPages} setError={setError} />
              ) : (
                <CameraCapture pages={pages} setPages={setPages} setError={setError} />
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            {status && (
              <p className="text-center text-blue-500 text-sm mb-4">{status}</p>
            )}

            {(pages[0] || pages[1]) && (
              <button
                onClick={handleExtract}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
              >
                {loading ? "⏳ Extracting Text..." : "Extract Text →"}
              </button>
            )}
          </div>
        )}

        {/* STEP 2 — EXTRACTED TEXT */}
        {currentPage === 2 && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Extracted Text</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Review the text extracted from your document
                </p>
              </div>
              <button
                onClick={() => setCurrentPage(1)}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition"
              >
                ← Back
              </button>
            </div>

            {/* ✅ Page 1 — sirf tab dikhao jab text ho */}
            {extractedText.page1 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Page 1
                  </h2>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {extractedText.page1}
                  </p>
                </div>
              </div>
            )}

            {/* ✅ Page 2 — sirf tab dikhao jab text ho */}
            {extractedText.page2 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Page 2
                  </h2>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {extractedText.page2}
                  </p>
                </div>
              </div>
            )}

            {/* ✅ Dono pages empty — sirf yeh ek message dikhao */}
            {!extractedText.page1 && !extractedText.page2 && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
                ❌ No text could be extracted from any page. Please upload a document with readable printed or handwritten text.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            {status && (
              <p className="text-center text-blue-500 text-sm mb-4">{status}</p>
            )}

            <button
              onClick={handleSummarise}
              disabled={summarising || (!extractedText.page1 && !extractedText.page2)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              {summarising ? "⏳ Summarising..." : "Summarise with AI →"}
            </button>

            {!extractedText.page1 && !extractedText.page2 && (
              <p className="text-center text-xs text-gray-400 mt-2">
                Upload a document with readable text to enable summarisation
              </p>
            )}
          </div>
        )}

        {/* STEP 3 — SUMMARY */}
        {currentPage === 3 && (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Summary</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Structured summary generated from your document
                </p>
              </div>
              <button
                onClick={() => setCurrentPage(2)}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition"
              >
                ← Back
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {wordCount} words
              </span>
              <button
                onClick={handleCopy}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition ${
                  copied
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy Summary"}
              </button>
            </div>

            {summary?.page1Summary && (
              <div className="mb-4 border border-blue-100 rounded-xl p-5 bg-blue-50">
                <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">
                  Page 1 Summary
                </h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {summary.page1Summary}
                </p>
              </div>
            )}

            {summary?.page2Summary && (
              <div className="mb-4 border border-blue-100 rounded-xl p-5 bg-blue-50">
                <h3 className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">
                  Page 2 Summary
                </h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {summary.page2Summary}
                </p>
              </div>
            )}

            {summary?.overallConclusion && (
              <div className="mb-4 border border-gray-200 rounded-xl p-5 bg-white">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Overall Conclusion
                </h3>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {summary.overallConclusion}
                </p>
              </div>
            )}

            <button
              onClick={resetAll}
              className="w-full mt-4 py-3 border border-blue-600 text-blue-600 rounded-xl
                         font-semibold hover:bg-blue-50 transition text-sm"
            >
              + Scan Another Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}