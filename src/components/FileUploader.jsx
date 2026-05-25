// src/components/FileUploader.jsx
import { useRef } from "react";
import { ERRORS } from "../utils/errorMessages";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_SIZE_MB = 10;

function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return ERRORS.INVALID_FILE_TYPE;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return ERRORS.FILE_TOO_LARGE;
  }
  return null;
}

function PageSlot({ label, file, onFileChange, onClear, error }) {
  const inputRef = useRef();
  const isPDF = file?.type === "application/pdf";
  const previewURL = file && !isPDF ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-gray-600">{label}</p>

      {!file ? (
        <div
          onClick={() => inputRef.current.click()}
          className="w-40 h-40 border-2 border-dashed border-indigo-300 rounded-xl
                     flex flex-col items-center justify-center cursor-pointer
                     hover:bg-indigo-50 transition text-center px-2"
        >
          <span className="text-3xl mb-1">📁</span>
          <span className="text-xs text-gray-400">Click to upload</span>
          <span className="text-xs text-gray-300 mt-1">PDF / PNG / JPG</span>
        </div>
      ) : (
        <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
          {isPDF ? (
            <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center">
              <span className="text-4xl">📕</span>
              <span className="text-xs text-gray-500 mt-1 px-2 text-center truncate w-full text-center">
                {file.name}
              </span>
            </div>
          ) : (
            <img
              src={previewURL}
              alt={label}
              className="w-full h-full object-cover"
            />
          )}
          {/* Clear button */}
          <button
            onClick={onClear}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full
                       w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
          >
            ✕
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

export default function FileUploader({ pages, setPages, setError }) {
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

    // If PDF uploaded for page 1 — auto-clear page 2
    if (index === 0 && file.type === "application/pdf") {
      updated[1] = null;
    }

    setPages(updated);
  };

  const handleClear = (index) => {
    const updated = [...pages];
    updated[index] = null;
    setPages(updated);
    setError(null);
  };

  const isPDFUploaded = pages[0]?.type === "application/pdf";

  return (
    <div>
      <p className="text-sm text-gray-500 text-center mb-4">
        Upload a PDF (both pages auto-extracted) or upload 2 separate images
      </p>
      <div className="flex justify-center gap-8 flex-wrap">
        <PageSlot
          label="Page 1"
          file={pages[0]}
          onFileChange={handleFileChange(0)}
          onClear={() => handleClear(0)}
        />
        {!isPDFUploaded && (
          <PageSlot
            label="Page 2 (optional)"
            file={pages[1]}
            onFileChange={handleFileChange(1)}
            onClear={() => handleClear(1)}
          />
        )}
      </div>
      {isPDFUploaded && (
        <p className="text-center text-xs text-indigo-400 mt-3">
          📕 PDF detected — both pages will be extracted automatically
        </p>
      )}
    </div>
  );
}