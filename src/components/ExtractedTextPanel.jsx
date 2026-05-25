const ExtractedTextPanel = ({ pages }) => {
  if (!pages || pages.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-700">📄 Extracted Text</h2>

      {pages.map(({ page, text, confidence }) => (
        <div key={page} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-gray-700">Page {page}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                confidence >= 70
                  ? 'bg-green-100 text-green-700'
                  : confidence >= 40
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              Confidence: {Math.round(confidence)}%
            </span>
          </div>

          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-white border border-gray-100 rounded-lg p-3 max-h-48 overflow-y-auto">
            {text || '(No text detected)'}
          </pre>
        </div>
      ))}
    </div>
  );
};

export default ExtractedTextPanel;