// src/components/SummaryDisplay.jsx
import React from "react";

const SectionCard = ({ title, content, icon, color }) => {
  const wordCount = content?.trim().split(/\s+/).filter(Boolean).length || 0;

  return (
    <div className={`rounded-2xl border ${color.border} ${color.bg} p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className={`font-semibold text-base ${color.title}`}>{title}</h3>
        </div>
        <span className="text-xs text-gray-400 bg-white/60 px-2 py-0.5 rounded-full border border-gray-200">
          {wordCount} words
        </span>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
        {content || "No content available."}
      </p>
    </div>
  );
};

const SummaryDisplay = ({ summary }) => {
  if (!summary) return null;

  const { page1Summary, page2Summary, conclusion } = summary;

  const totalWords = [page1Summary, page2Summary, conclusion]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="mt-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span>📋</span> Document Summary
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Total: {totalWords} words
        </span>
      </div>

      {/* Summary Cards */}
      <SectionCard
        title="Page 1 Summary"
        content={page1Summary}
        icon="📄"
        color={{
          bg: "bg-blue-50",
          border: "border-blue-200",
          title: "text-blue-800",
        }}
      />

      <SectionCard
        title="Page 2 Summary"
        content={page2Summary}
        icon="📄"
        color={{
          bg: "bg-purple-50",
          border: "border-purple-200",
          title: "text-purple-800",
        }}
      />

      <SectionCard
        title="Conclusion"
        content={conclusion}
        icon="🧠"
        color={{
          bg: "bg-green-50",
          border: "border-green-200",
          title: "text-green-800",
        }}
      />
    </div>
  );
};

export default SummaryDisplay;