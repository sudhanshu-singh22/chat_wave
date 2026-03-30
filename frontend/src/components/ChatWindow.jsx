import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import useChatStore from "../context/chatStore";
import useChat from "../hooks/useChat";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import Avatar from "./Avatar";
import FileUploader from "./FileUploader";
import EmojiPicker from "emoji-picker-react";
import { fetchGroupMessages, deleteChat as deleteChatApi, deleteGroupApi, leaveGroup } from "../services/api";
import { getSocket } from "../socket/socket";

async function isMessageFlagged(text) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api/moderate`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }
    );
    if (!response.ok) return false;
    const data = await response.json();
    return data.flagged === true;
  } catch { return false; }
}

export default function ChatWindow() {
  const { user } = useAuth();
  const {
    activeChat, messages, groupMessages, onlineUsers, typingUsers,
    darkMode, setGroupMessages, clearDmChat, removeGroup,
  } = useChatStore();

  const { loadMessages, sendMessage, sendFile, emitTyping, emitStopTyping } = useChat();

  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null); // "deleteChat" | "deleteGroup" | "leaveGroup"
  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const emojiRef = useRef(null);
  const headerMenuRef = useRef(null);

  const isGroup = activeChat?.isGroup;
  const chatMessages = isGroup
    ? (groupMessages[activeChat?.id] || [])
    : (messages[activeChat?.id] || []);
  const isOnline = !isGroup && onlineUsers.includes(activeChat?.id);
  const isTyping = !isGroup && typingUsers[activeChat?.id];

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChat?.id) return;
    if (isGroup) {
      fetchGroupMessages(activeChat.id)
        .then((msgs) => setGroupMessages(activeChat.id, msgs))
        .catch(console.error);
    } else {
      loadMessages(activeChat.id);
    }
    inputRef.current?.focus();
    setShowHeaderMenu(false);
  }, [activeChat?.id, isGroup]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Close emoji picker
  useEffect(() => {
    const handler = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close header menu
  useEffect(() => {
    const handler = (e) => { if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setShowHeaderMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Clear warning after 4s
  useEffect(() => {
    if (!warningMsg) return;
    const t = setTimeout(() => setWarningMsg(""), 4000);
    return () => clearTimeout(t);
  }, [warningMsg]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    if (isGroup) {
      setModerating(true);
      const flagged = await isMessageFlagged(trimmed);
      setModerating(false);
      if (flagged) {
        setWarningMsg("⚠️ Your message contains inappropriate content and was not sent.");
        return;
      }

      const socket = getSocket();
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMsg = {
        id: optimisticId,
        group_id: activeChat.id,
        sender_id: user.id,
        content: trimmed,
        created_at: new Date().toISOString(),
        sender: { id: user.id, name: user.user_metadata?.name || user.email, avatar_url: user.user_metadata?.avatar_url || null },
        _optimistic: true,
      };
      useChatStore.getState().appendGroupMessage(optimisticMsg);
      setInput("");
      setWarningMsg("");

      socket.emit("send_group_message", {
        group_id: activeChat.id,
        sender_id: user.id,
        content: trimmed,
        _optimisticId: optimisticId,
      });
      return;
    }

    // DM — run moderation
    setModerating(true);
    const flagged = await isMessageFlagged(trimmed);
    setModerating(false);
    if (flagged) {
      setWarningMsg("⚠️ Your message contains inappropriate content and was not sent.");
      return;
    }
    sendMessage(trimmed);
    setInput("");
    emitStopTyping();
    setShowEmoji(false);
    setWarningMsg("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!isGroup) {
      e.target.value.trim() ? emitTyping() : emitStopTyping();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (fileData) => {
    if (isGroup) {
      const socket = getSocket();
      socket.emit("send_group_message", {
        group_id: activeChat.id,
        sender_id: user.id,
        content: input.trim() || null,
        ...fileData,
      });
      setInput("");
      return;
    }
    await sendFile(fileData, input);
    setInput("");
    emitStopTyping();
  };

  // ── Header action handlers ──────────────────────────────────────────────
  const handleConfirmAction = async () => {
    const chatId = activeChat?.id;
    if (!chatId) { setShowConfirm(null); return; }
    setActionLoading(true);
    try {
      if (showConfirm === "deleteChat") {
        await deleteChatApi(chatId);
        clearDmChat(chatId);
      } else if (showConfirm === "deleteGroup") {
        await deleteGroupApi(chatId);
        removeGroup(chatId);
      } else if (showConfirm === "leaveGroup") {
        await leaveGroup(chatId);
        removeGroup(chatId);
      }
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoading(false);
      setShowConfirm(null);
    }
  };

  // ── Back to sidebar (mobile only) ───────────────────────────────────────
  const handleBack = () => {
    useChatStore.getState().setActiveChat(null);
  };

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  for (const msg of chatMessages) {
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: "date-divider", date: msgDate, id: `divider-${msgDate}` });
      lastDate = msgDate;
    }
    groupedMessages.push({ type: "message", ...msg });
  }

  const isGroupAdmin = isGroup && activeChat?.created_by === user?.id;
  const memberCount = isGroup ? (activeChat?.members?.length || 0) : 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-chat)" }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border-color)" }}
      >
        {/* ← Back button — mobile only */}
        <button
          onClick={handleBack}
          className="md:hidden flex-shrink-0 p-1.5 -ml-1 rounded-full hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-muted)" }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>

        {isGroup ? (
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0" style={{ background: "var(--accent)" }}>
            {activeChat?.name?.[0]?.toUpperCase() || "G"}
          </div>
        ) : (
          <Avatar name={activeChat?.name || "?"} url={activeChat?.avatar_url} size={42} showOnline={false} />
        )}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
            {activeChat?.name || activeChat?.email}
          </p>
          <p className="text-xs" style={{ color: isOnline ? "var(--accent)" : "var(--text-muted)" }}>
            {isGroup
              ? `${memberCount} member${memberCount !== 1 ? "s" : ""}`
              : isTyping ? "typing..." : isOnline ? "online" : "offline"}
          </p>
        </div>

        {/* Header action menu */}
        <div ref={headerMenuRef} className="relative">
          <button
            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            className="p-2 rounded-full hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>

          {showHeaderMenu && (
            <div
              className="absolute right-0 top-10 w-48 rounded-xl shadow-xl z-50 py-1 overflow-hidden"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}
            >
              {!isGroup && (
                <button
                  onClick={() => { setShowConfirm("deleteChat"); setShowHeaderMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                  style={{ color: "#ef4444" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  Delete Chat
                </button>
              )}
              {isGroup && !isGroupAdmin && (
                <button
                  onClick={() => { setShowConfirm("leaveGroup"); setShowHeaderMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                  style={{ color: "#f59e0b" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                  Leave Group
                </button>
              )}
              {isGroup && isGroupAdmin && (
                <button
                  onClick={() => { setShowConfirm("deleteGroup"); setShowHeaderMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:opacity-80"
                  style={{ color: "#ef4444" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  Delete Group
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm dialog ───────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
            <h3 className="font-bold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              {showConfirm === "deleteChat" ? "Delete Chat?" : showConfirm === "deleteGroup" ? "Delete Group?" : "Leave Group?"}
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              {showConfirm === "deleteChat"
                ? "This will permanently remove all messages in this conversation for both users."
                : showConfirm === "deleteGroup"
                ? "This will permanently delete the group and all its messages for everyone."
                : "You will no longer receive messages from this group."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--border-color)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "#ef4444" }}
              >
                {actionLoading ? "Please wait..." : showConfirm === "leaveGroup" ? "Leave" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {chatMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-6 py-8 rounded-2xl" style={{ background: "rgba(0,0,0,0.04)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--accent-light)" }}>
                <svg viewBox="0 0 24 24" fill="var(--accent)" className="w-7 h-7">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                {isGroup ? `Welcome to ${activeChat?.name}!` : `Start a conversation with ${activeChat?.name}`}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {isGroup ? `${memberCount} members` : "Messages are end-to-end encrypted"}
              </p>
            </div>
          </div>
        )}

        {groupedMessages.map((item) => {
          if (item.type === "date-divider") {
            return (
              <div key={item.id} className="flex items-center justify-center py-2">
                <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.12)", color: "var(--text-secondary)" }}>
                  {formatDateLabel(item.date)}
                </span>
              </div>
            );
          }
          return (
            <MessageBubble
              key={item.id}
              message={item}
              isSent={item.sender_id === user?.id}
              isGroup={isGroup}
              otherUserId={isGroup ? null : activeChat?.id}
            />
          );
        })}

        {isTyping && <TypingIndicator name={activeChat?.name} />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Warning banner ───────────────────────────────── */}
      {warningMsg && (
        <div
          className="mx-3 mb-2 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in flex items-start gap-2"
          style={{ background: "rgba(220, 38, 38, 0.12)", border: "1px solid rgba(220, 38, 38, 0.3)", color: "#dc2626" }}
        >
          <span className="flex-shrink-0 mt-0.5">🚫</span>
          <span>{warningMsg}</span>
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────── */}
      <div
        className="flex items-end gap-2 px-3 py-3 flex-shrink-0 relative"
        style={{ background: "var(--header-bg)", borderTop: "1px solid var(--border-color)" }}
      >
        {/* Emoji picker */}
        <div ref={emojiRef} className="relative flex-shrink-0">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2 rounded-full transition-opacity hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
            </svg>
          </button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50 animate-fade-in">
              <EmojiPicker onEmojiClick={handleEmojiClick} theme={darkMode ? "dark" : "light"} height={380} width={320} searchPlaceholder="Search emoji..." lazyLoadEmojis />
            </div>
          )}
        </div>

        {/* File uploader */}
        <div className="flex-shrink-0">
          <FileUploader onFileSelect={handleFileSelect} userId={user?.id} disabled={uploading} />
        </div>

        {/* Text input */}
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isGroup ? `Message ${activeChat?.name}` : "Type a message"}
            rows={1}
            className="w-full resize-none rounded-xl px-4 py-2.5 text-sm leading-relaxed"
            style={{
              background: "var(--bg-primary)", color: "var(--text-primary)",
              border: "none", outline: "none",
              fontFamily: "'DM Sans', sans-serif", maxHeight: "120px", overflowY: "auto",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || moderating}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{
            background: input.trim() && !moderating ? "var(--accent)" : "var(--border-color)",
            color: "white",
            cursor: input.trim() && !moderating ? "pointer" : "default",
          }}
        >
          {moderating ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function formatDateLabel(dateStr) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return dateStr;
}
