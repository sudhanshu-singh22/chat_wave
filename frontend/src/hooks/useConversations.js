import { useEffect, useCallback } from "react";
import { getSocket } from "../socket/socket";
import { fetchConversations } from "../services/api";
import useChatStore from "../context/chatStore";
import { useAuth } from "../context/AuthContext";

/**
 * Keeps the sidebar conversation list fresh.
 * Re-fetches whenever a new message arrives via socket.
 */
const useConversations = () => {
  const { user } = useAuth();
  const { setConversations } = useChatStore();

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const convos = await fetchConversations(user.id);
      setConversations(convos);
    } catch (err) {
      console.error("useConversations refresh error:", err);
    }
  }, [user, setConversations]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    // Refresh sidebar whenever any message arrives
    socket.on("receive_message", refresh);

    return () => {
      socket.off("receive_message", refresh);
    };
  }, [user, refresh]);

  return { refresh };
};

export default useConversations;
