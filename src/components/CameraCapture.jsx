// src/components/CameraCapture.jsx
import { useRef, useState, useEffect } from "react";

export default function CameraCapture({ pages, setPages, setError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = async (pageIndex) => {
    setError(null);
    setActivePage(pageIndex);
    setCameraReady(false);

    // Pehle purana stream band karo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      // Simple video: true — laptop webcam ke liye sabse reliable
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;
      setCameraOn(true);

      // Stream ko video element se connect karo
      // setState ke baad DOM update hone ka wait karo
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => {
            console.error("Video play error:", e);
          });
        }
      }, 100);

    } catch (err) {
      setCameraOn(false);
      if (err.name === "NotAllowedError") {
        setError("❌ Camera permission denied. Browser settings mein camera allow karo.");
      } else if (err.name === "NotFoundError") {
        setError("❌ Koi camera nahi mila is device pe.");
      } else if (err.name === "NotReadableError") {
        setError("❌ Camera already kisi aur app mein use ho raha hai. Usse band karo.");
      } else {
        setError("❌ Camera error: " + err.message);
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState < 2) {
      setError("Camera abhi ready nahi hai, ek second ruko.");
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg", 0.92);

    // Check karo capture blank toh nahi
    if (dataURL === "data:,") {
      setError("Capture failed — camera feed ready nahi thi. Retry karo.");
      return;
    }

    const newPages = [...pages];
    newPages[activePage] = dataURL;
    setPages(newPages);
    stopCamera();
  };

  const retake = (pageIndex) => {
    const newPages = [...pages];
    newPages[pageIndex] = null;
    setPages(newPages);
    startCamera(pageIndex);
  };

  // Unmount pe cleanup
  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">
        📷 Webcam se document ke 2 pages capture karo
      </p>

      {/* Live Camera Preview */}
      {cameraOn && (
        <div className="space-y-3">
          <p className="text-center text-sm text-indigo-600 font-medium">
            Page {activePage + 1} capture kar rahe hain — document frame mein rakhho
          </p>

          {/* Loading state jab tak camera ready na ho */}
          {!cameraReady && (
            <div className="w-full h-56 rounded-xl border border-gray-200 bg-gray-900
                            flex items-center justify-center">
              <p className="text-white text-sm animate-pulse">⏳ Camera load ho raha hai...</p>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              videoRef.current?.play();
              setCameraReady(true);
            }}
            onCanPlay={() => setCameraReady(true)}
            style={{ display: cameraReady ? "block" : "none" }}
            className="w-full rounded-xl border border-gray-200 max-h-72 object-cover bg-black"
          />

          {cameraReady && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={capturePhoto}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl
                           font-medium hover:bg-indigo-700 transition"
              >
                📸 Capture
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl
                           font-medium hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Page Buttons + Previews */}
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            {pages[i] ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img
                  src={pages[i]}
                  alt={`Page ${i + 1}`}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/40
                                text-white text-xs text-center py-1">
                  Page {i + 1} ✅
                </div>
                <button
                  onClick={() => retake(i)}
                  className="absolute top-2 right-2 bg-yellow-500 text-white
                             text-xs px-2 py-1 rounded-lg hover:bg-yellow-600"
                >
                  🔄 Retake
                </button>
              </div>
            ) : (
              <button
                onClick={() => startCamera(i)}
                disabled={cameraOn}
                className="w-full h-40 border-2 border-dashed border-indigo-300
                           rounded-xl flex flex-col items-center justify-center gap-2
                           text-indigo-500 hover:bg-indigo-50 disabled:opacity-40
                           disabled:cursor-not-allowed transition"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm font-medium">Capture Page {i + 1}</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}