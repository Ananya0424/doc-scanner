import { useState, useRef } from "react";

function CameraCapture({ pages, setPages, setError }) {
  const [activeSlot, setActiveSlot] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);

  const startCamera = async (slot) => {
    setActiveSlot(slot);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setStreaming(true);
    } catch (err) {
  if (
    err.name === "NotAllowedError" ||
    err.name === "PermissionDeniedError"
  ) {
    setError(ERRORS.CAMERA_DENIED);
  } else if (err.name === "NotFoundError") {
    setError(ERRORS.CAMERA_NOT_SUPPORTED);
  } else {
    setError(ERRORS.CAMERA_FAILED);
  }
}
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");

    const newPages = [...pages];
    newPages[activeSlot] = dataUrl;
    setPages(newPages);

    // Stop camera
    video.srcObject?.getTracks().forEach((t) => t.stop());
    setStreaming(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-700">📷 Camera Capture</h2>

      <div className="flex gap-3">
        {[0, 1].map((slot) => (
          <button
            key={slot}
            onClick={() => startCamera(slot)}
            className="flex-1 py-3 rounded-xl border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition"
          >
            {pages[slot] ? `✅ Page ${slot + 1} captured` : `📸 Capture Page ${slot + 1}`}
          </button>
        ))}
      </div>

      {streaming && (
        <div className="space-y-3">
          <video ref={videoRef} className="w-full rounded-xl border border-gray-200" />
          <button
            onClick={capturePhoto}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            📷 Take Photo (Page {activeSlot + 1})
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Preview */}
      <div className="flex gap-3">
        {pages.map((page, i) =>
          page ? (
            <img
              key={i}
              src={page}
              alt={`Page ${i + 1}`}
              className="w-1/2 rounded-xl border border-gray-200 object-cover"
            />
          ) : null
        )}
      </div>
    </div>
  );
}

export default CameraCapture;