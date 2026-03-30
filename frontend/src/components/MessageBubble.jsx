import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { deleteMessage, deleteGroupMessage } from "../services/api";
import useChatStore from "../context/chatStore";
import { getSocket } from "../socket/socket";

function getFileIcon(mimeType) {
  if (!mimeType) return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎥";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📕";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📄";
  return "📎";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export default function MessageBubble({ message, isSent, isGroup, otherUserId }) {
  const time = format(new Date(message.created_at), "h:mm a");
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);
  const { deleteDmMessage, deleteGroupMessageInStore, deleteDmMessageForMe, deleteGroupMessageForMe, activeChat } = useChatStore();

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setShowMenu(false);
    try {
      if (isSent) {
        // Sender deletes → remove for everyone (server + socket broadcast)
        if (isGroup) {
          await deleteGroupMessage(message.group_id, message.id);
          deleteGroupMessageInStore(message.id, message.group_id);
        } else {
          await deleteMessage(message.id);
          deleteDmMessage(message.id, otherUserId);
        }
      } else {
        // Receiver deletes → remove only for themselves (local only, no server call needed)
        const socket = getSocket();
        if (isGroup) {
          deleteGroupMessageForMe(message.id, message.group_id);
          socket.emit("delete_group_message_for_me", { messageId: message.id, groupId: message.group_id });
        } else {
          deleteDmMessageForMe(message.id, otherUserId);
          socket.emit("delete_dm_message_for_me", { messageId: message.id, otherUserId });
        }
      }
    } catch (err) {
      console.error("Delete message error:", err);
      setDeleting(false);
    }
  };

  // Label changes based on who is deleting
  const deleteLabel = isSent ? "Delete for Everyone" : "Delete for Me";

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-0.5 animate-slide-up group`}>
      <div className="flex flex-col max-w-[65%]" style={{ alignItems: isSent ? "flex-end" : "flex-start" }}>
        {/* Sender name in group chats */}
        {isGroup && !isSent && (
          <span className="text-xs font-semibold mb-1 px-1" style={{ color: "var(--accent)" }}>
            {message.sender?.name || "Unknown"}
          </span>
        )}

        <div className="relative flex items-end gap-1">
          {/* Delete button — shown for ALL messages (sent + received) on hover */}
          <div
            ref={menuRef}
            className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ order: isSent ? -1 : 1 }}
          >
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-full hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-muted)" }}
              title="Message options"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
            {showMenu && (
              <div
                className={`absolute bottom-8 w-44 rounded-xl shadow-xl z-50 py-1 overflow-hidden ${isSent ? "right-0" : "left-0"}`}
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
              >
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                  style={{ color: "#ef4444" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  {deleteLabel}
                </button>
              </div>
            )}
          </div>

          {/* Bubble */}
          <div
            className={`px-3 py-2 shadow-sm ${isSent ? "chat-bubble-sent" : "chat-bubble-received"} ${deleting ? "opacity-50" : ""}`}
            style={{ wordBreak: "break-word", transition: "opacity 0.2s" }}
          >
            {/* File display */}
            {message.file_url && (
              <div className="mb-2">
                {message.file_type?.startsWith("image/") ? (
                  <img
                    src={message.file_url}
                    alt={message.file_name}
                    className="max-w-sm max-h-64 rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => window.open(message.file_url, "_blank")}
                  />
                ) : (
                  <a
                    href={message.file_url}
                    download={message.file_name}
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors"
                    style={{ background: "rgba(255,255,255,0.1)", color: "var(--accent)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                  >
                    <span className="text-lg">{getFileIcon(message.file_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{message.file_name}</p>
                      <p className="text-xs opacity-75">{formatFileSize(message.file_size)}</p>
                    </div>
                  </a>
                )}
              </div>
            )}

            {/* Text content */}
            {message.content && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
                {message.content}
              </p>
            )}

            {/* Timestamp and read tick */}
            <div className={`flex items-center gap-1 mt-0.5 ${isSent ? "justify-end" : "justify-start"}`}>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{time}</span>
              {isSent && (
                <span style={{ color: "var(--text-muted)" }}>
                  {message.read_at ? (
                    <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
                      <path d="M1 9l4 4L10 7" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 9l4 4 6-6" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 18 18" fill="none" className="w-4 h-4">
                      <path d="M3 9l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
