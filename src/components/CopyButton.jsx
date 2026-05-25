// src/components/CopyButton.jsx
import { useState } from "react";

export default function CopyButton({ textToCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500); // reset after 2.5s
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${
          copied
            ? "bg-green-100 text-green-700 border border-green-300"
            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300"
        }`}
    >
      {copied ? (
        <>
          <span>✅</span> Copied!
        </>
      ) : (
        <>
          <span>📋</span> Copy Summary
        </>
      )}
    </button>
  );
}