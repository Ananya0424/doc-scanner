const OcrProgress = ({ page, progress, totalPages }) => {
  return (
    <div className="w-full max-w-md mx-auto mt-4">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>
          Extracting text — Page {page} of {totalPages}
        </span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1 text-center">
        This may take a few seconds per page…
      </p>
    </div>
  );
};

export default OcrProgress;