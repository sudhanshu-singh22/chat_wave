import { useEffect } from "react";
import { getSocket } from "../socket/socket";
import useChatStore from "../context/chatStore";
import { useAuth } from "../context/AuthContext";

const useSocket = () => {
  const { user } = useAuth();
  const {
    appendMessage, setOnlineUsers, setTyping, markMessagesReadInStore,
    appendGroupMessage, deleteGroupMessageInStore, removeGroup, deleteDmMessage,
    deleteDmMessageForMe, deleteGroupMessageForMe,
  } = useChatStore();

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    // ── DM events ──────────────────────────────────────────────────────
    const onReceiveMessage = (message) => appendMessage(message, user.id);

    const onMessageDeleted = ({ messageId, receiver_id }) => {
      // figure out the other participant
      const otherUserId = receiver_id === user.id
        ? useChatStore.getState().activeChat?.id
        : receiver_id;
      if (otherUserId) deleteDmMessage(messageId, otherUserId);
    };

    const onMessagesRead = ({ sender_id, receiver_id, read_at }) =>
      markMessagesReadInStore({ sender_id, receiver_id, read_at });

    const onOnlineUsers = (userIds) => setOnlineUsers(userIds);
    const onTyping = ({ sender_id }) => setTyping(sender_id, true);
    const onStopTyping = ({ sender_id }) => setTyping(sender_id, false);

    // ── Group events ───────────────────────────────────────────────────
    const onReceiveGroupMessage = (message) => appendGroupMessage(message);

    const onGroupMessageDeleted = ({ messageId, groupId }) =>
      deleteGroupMessageInStore(messageId, groupId);

    const onGroupDeleted = ({ groupId }) => removeGroup(groupId);

    // ── Delete for me events (receiver-side local delete) ──────────────
    const onDmMessageDeletedForMe = ({ messageId, otherUserId }) =>
      deleteDmMessageForMe(messageId, otherUserId);

    const onGroupMessageDeletedForMe = ({ messageId, groupId }) =>
      deleteGroupMessageForMe(messageId, groupId);

    socket.on("receive_message", onReceiveMessage);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("messages_read", onMessagesRead);
    socket.on("online_users", onOnlineUsers);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);
    socket.on("receive_group_message", onReceiveGroupMessage);
    socket.on("group_message_deleted", onGroupMessageDeleted);
    socket.on("group_deleted", onGroupDeleted);
    socket.on("dm_message_deleted_for_me", onDmMessageDeletedForMe);
    socket.on("group_message_deleted_for_me", onGroupMessageDeletedForMe);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("messages_read", onMessagesRead);
      socket.off("online_users", onOnlineUsers);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      socket.off("receive_group_message", onReceiveGroupMessage);
      socket.off("group_message_deleted", onGroupMessageDeleted);
      socket.off("group_deleted", onGroupDeleted);
      socket.off("dm_message_deleted_for_me", onDmMessageDeletedForMe);
      socket.off("group_message_deleted_for_me", onGroupMessageDeletedForMe);
    };
  }, [user]);
};

export default useSocket;
