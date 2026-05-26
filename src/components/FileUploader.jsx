// src/components/FileUploader.jsx
import { useRef, useState } from "react";
import { ERRORS } from "../utils/errorMessages";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_SIZE_MB = 10;

function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) return ERRORS.INVALID_FILE_TYPE;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return ERRORS.FILE_TOO_LARGE;
  return null;
}

export default function FileUploader({ pages, setPages, setError }) {
  const input1Ref = useRef();
  const input2Ref = useRef();
  const [showPage2, setShowPage2] = useState(false);

  const isPDFUploaded = pages[0]?.type === "application/pdf";

  const handleFileChange = (index) => (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }

    setError(null);
    const updated = [...pages];
    updated[index] = file;

    if (index === 0 && file.type === "application/pdf") {
      updated[1] = null;
      setShowPage2(false);
    }

    setPages(updated);
  };

  const handleClear = (index) => {
    const updated = [...pages];
    updated[index] = null;
    setPages(updated);
    setError(null);
    if (index === 1) setShowPage2(false);
    if (index === 0) {
      updated[1] = null;
      setPages([null, null]);
      setShowPage2(false);
    }
  };

  const getPreviewURL = (file) => {
    if (!file || file.type === "application/pdf") return null;
    return URL.createObjectURL(file);
  };

  return (
    <div>
      {/* ── Instruction text ── */}
      <p className="text-sm text-gray-400 text-center mb-6">
        {isPDFUploaded
          ? "PDF detected — both pages will be extracted automatically"
          : "Upload an image or PDF document"}
      </p>

      <div className="flex flex-col items-center gap-4">

        {/* ── PAGE 1 SLOT ── */}
        {!pages[0] ? (
          // Empty state — big upload area
          <div
            onClick={() => input1Ref.current.click()}
            className="w-full border-2 border-dashed border-blue-200 rounded-2xl
                       flex flex-col items-center justify-center cursor-pointer
                       hover:bg-blue-50 hover:border-blue-400 transition py-10 px-4"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Click to upload document</p>
            <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG supported — max 10MB</p>
          </div>
        ) : (
          // File uploaded — show preview card
          <div className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50">
            <div className="flex items-center gap-4">

              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                {isPDFUploaded ? (
                  <div className="w-full h-full bg-red-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                ) : (
                  <img
                    src={getPreviewURL(pages[0])}
                    alt="Page 1"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{pages[0].name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isPDFUploaded ? "PDF — both pages auto-extracted" : "Image — Page 1"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    {isPDFUploaded ? "PDF" : "Image"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {(pages[0].size / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleClear(0)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500
                           flex items-center justify-center text-gray-500 transition flex-shrink-0"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <input
          ref={input1Ref}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange(0)}
        />

        {/* ── PAGE 2 — Only show if image uploaded (not PDF) ── */}
        {pages[0] && !isPDFUploaded && (
          <>
            {!showPage2 && !pages[1] ? (
              // Show "+ Add Page 2" button
              <button
                onClick={() => setShowPage2(true)}
                className="w-full border-2 border-dashed border-gray-200 rounded-2xl
                           py-4 flex items-center justify-center gap-2
                           text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500
                           transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Page 2 (optional)
              </button>
            ) : (
              // Show page 2 upload slot
              <>
                {!pages[1] ? (
                  <div
                    onClick={() => input2Ref.current.click()}
                    className="w-full border-2 border-dashed border-blue-200 rounded-2xl
                               flex flex-col items-center justify-center cursor-pointer
                               hover:bg-blue-50 hover:border-blue-400 transition py-8 px-4"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Upload Page 2</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG supported</p>
                  </div>
                ) : (
                  // Page 2 uploaded — preview card
                  <div className="w-full border border-gray-200 rounded-2xl p-4 bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        <img
                          src={getPreviewURL(pages[1])}
                          alt="Page 2"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{pages[1].name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Image — Page 2</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                            Image
                          </span>
                          <span className="text-xs text-gray-400">
                            {(pages[1].size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleClear(1)}
                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500
                                   flex items-center justify-center text-gray-500 transition flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={input2Ref}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileChange(1)}
                />
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}