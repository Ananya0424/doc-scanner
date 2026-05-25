// src/components/PagePreview.jsx
import { useState, useEffect } from "react";

function PagePreview({ page, pageNumber, onRemove }) {
  const [objectURL, setObjectURL] = useState(null);

  useEffect(() => {
    if (page instanceof File) {
      const url = URL.createObjectURL(page);
      setObjectURL(url);
      // Cleanup: revoke the URL when component unmounts or page changes
      return () => URL.revokeObjectURL(url);
    } else {
      setObjectURL(null);
    }
  }, [page]);

  if (!page) return null;

  const isDataURL = typeof page === "string" && page.startsWith("data:");
  const isPDF = page instanceof File && page.type === "application/pdf";
  const isImage = page instanceof File && page.type.startsWith("image/");

  const imgSrc = isDataURL ? page : objectURL;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {(isDataURL || isImage) && imgSrc ? (
        <img
          src={imgSrc}
          alt={`Page ${pageNumber}`}
          className="w-full h-48 object-cover"
        />
      ) : isPDF ? (
        <div className="w-full h-48 bg-red-50 flex flex-col items-center justify-center">
          <span className="text-4xl">📕</span>
          <span className="text-xs text-gray-500 mt-1">{page.name}</span>
        </div>
      ) : null}

      <button
        onClick={onRemove}
        className="absolute top-2 right-2 bg-red-500 text-white rounded-full
                   w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
        aria-label="Remove page"
      >
        ✕
      </button>

      <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-1">
        Page {pageNumber}
      </div>
    </div>
  );
}

export default PagePreview;