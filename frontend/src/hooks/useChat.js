import { useCallback, useRef } from "react";
import { getSocket } from "../socket/socket";
import { fetchMessages, markMessagesRead } from "../services/api";
import useChatStore from "../context/chatStore";
import { useAuth } from "../context/AuthContext";

const useChat = () => {
  const { user } = useAuth();
  const { setMessages, activeChat } = useChatStore();
  const typingTimerRef = useRef(null);

  const loadMessages = useCallback(
    async (otherUserId) => {
      if (!user || !otherUserId) return;
      try {
        const msgs = await fetchMessages(user.id, otherUserId);
        setMessages(otherUserId, msgs);
        // Mark as read
        await markMessagesRead(otherUserId, user.id);
      } catch (err) {
        console.error("loadMessages error:", err);
      }
    },
    [user, setMessages]
  );

  const sendMessage = useCallback(
    (content) => {
      if (!user || !activeChat || !content.trim()) return;
      const socket = getSocket();
      socket.emit("send_message", {
        sender_id: user.id,
        receiver_id: activeChat.id,
        content: content.trim(),
      });
    },
    [user, activeChat]
  );

  const sendFile = useCallback(
    async (fileData, message = "") => {
      if (!user || !activeChat || !fileData?.file_url) return;
      const socket = getSocket();
      socket.emit("send_message", {
        sender_id: user.id,
        receiver_id: activeChat.id,
        content: message.trim() || null,
        file_url: fileData.file_url,
        file_name: fileData.file_name,
        file_type: fileData.file_type,
        file_size: fileData.file_size,
      });
    },
    [user, activeChat]
  );

  const emitTyping = useCallback(() => {
    if (!user || !activeChat) return;
    const socket = getSocket();
    socket.emit("typing", { sender_id: user.id, receiver_id: activeChat.id });

    // Auto stop after 2s
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        sender_id: user.id,
        receiver_id: activeChat.id,
      });
    }, 2000);
  }, [user, activeChat]);

  const emitStopTyping = useCallback(() => {
    if (!user || !activeChat) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    const socket = getSocket();
    socket.emit("stop_typing", {
      sender_id: user.id,
      receiver_id: activeChat.id,
    });
  }, [user, activeChat]);

  return { loadMessages, sendMessage, sendFile, emitTyping, emitStopTyping };
};

export default useChat;
