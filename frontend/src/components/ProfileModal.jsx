import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { upsertUserProfile, uploadFile } from "../services/api";

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [quote, setQuote] = useState(user?.quote || "");
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Upload from device ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError("");
  };

  // ── Camera ───────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setShowCamera(true);
      // Wait for DOM then assign stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      setError("Could not access camera. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], "camera-photo.jpg", { type: "image/jpeg" });
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  // ── Save ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      let avatar_url = user?.avatar_url || null;

      // Upload new photo if selected
      if (avatarFile) {
        const uploaded = await uploadFile(avatarFile, user.id);
        avatar_url = uploaded.file_url;
      }

      const updated = await upsertUserProfile({
        id: user.id,
        email: user.email,
        name: name.trim() || user.name,
        avatar_url,
        quote: quote.trim() || null,
      });

      // Update local auth context
      updateProfile(updated);
      onClose();
    } catch (err) {
      console.error("Profile save error:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar section */}
          <div className="flex flex-col items-center gap-3">
            {/* Preview */}
            <div className="relative">
              {showCamera ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="w-32 h-32 rounded-full object-cover"
                  style={{ border: "3px solid var(--accent)" }}
                />
              ) : (
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold"
                  style={{ background: "var(--accent)", color: "white" }}
                >
                  {(name || user?.name || "?")[0].toUpperCase()}
                </div>
              )}
              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Camera / Upload buttons */}
            {showCamera ? (
              <div className="flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)" }}
                >
                  📸 Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  📁 Upload Photo
                </button>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                  style={{ background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                >
                  📷 Take Photo
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full rounded-xl px-4 py-2.5 text-sm"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                outline: "none",
              }}
            />
          </div>

          {/* Quote */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Motivational Quote
              <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>
                (shown on your profile)
              </span>
            </label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="e.g. Stay hungry, stay foolish."
              maxLength={150}
              rows={3}
              className="w-full rounded-xl px-4 py-2.5 text-sm resize-none"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                outline: "none",
              }}
            />
            <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>
              {quote.length}/150
            </p>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ background: "#fee2e2", color: "#dc2626" }}>
              {error}
            </p>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{
              background: saving ? "var(--border-color)" : "var(--accent)",
              cursor: saving ? "default" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
