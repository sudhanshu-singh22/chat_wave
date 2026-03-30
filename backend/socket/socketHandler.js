const supabase = require("../services/supabaseClient");

// Track online users: { userId -> socketId }
const onlineUsers = new Map();

function initializeSocket(io) {
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ── USER COMES ONLINE ──────────────────────────────────────────────
    socket.on("user_online", async (userId) => {
      if (!userId) return;
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;

      // Join all group rooms
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);
      (memberships || []).forEach(({ group_id }) => socket.join(`group:${group_id}`));

      io.emit("online_users", Array.from(onlineUsers.keys()));
      console.log(`🟢 User online: ${userId}`);
    });

    // ── JOIN GROUP ROOM (called after creating/joining a group) ─────────
    socket.on("join_group", (groupId) => {
      socket.join(`group:${groupId}`);
    });

    // ── SEND DM MESSAGE ────────────────────────────────────────────────
    socket.on("send_message", async (data) => {
      const { sender_id, receiver_id, content, file_url, file_name, file_type, file_size } = data;
      if (!sender_id || !receiver_id) return;
      if (!content?.trim() && !file_url) return;
      try {
        const { data: message, error } = await supabase
          .from("messages")
          .insert({ sender_id, receiver_id, content: content?.trim() || null, file_url: file_url || null, file_name: file_name || null, file_type: file_type || null, file_size: file_size || null })
          .select(`*, sender:users!messages_sender_id_fkey(id, name, avatar_url), receiver:users!messages_receiver_id_fkey(id, name, avatar_url)`)
          .single();
        if (error) { console.error("Message insert error:", error); socket.emit("message_error", { error: "Failed to send message" }); return; }
        socket.emit("receive_message", message);
        const receiverSocketId = onlineUsers.get(receiver_id);
        if (receiverSocketId) io.to(receiverSocketId).emit("receive_message", message);
      } catch (err) { console.error("send_message error:", err); socket.emit("message_error", { error: "Server error" }); }
    });

    // ── SEND GROUP MESSAGE ─────────────────────────────────────────────
    socket.on("send_group_message", async (data) => {
      const { group_id, sender_id, content, file_url, file_name, file_type, file_size } = data;
      if (!group_id || !sender_id) return;
      if (!content?.trim() && !file_url) return;
      try {
        // Verify sender is a member
        const { data: member } = await supabase.from("group_members").select("id").eq("group_id", group_id).eq("user_id", sender_id).single();
        if (!member) { socket.emit("message_error", { error: "Not a group member" }); return; }

        const { data: message, error } = await supabase
          .from("group_messages")
          .insert({ group_id, sender_id, content: content?.trim() || null, file_url: file_url || null, file_name: file_name || null, file_type: file_type || null, file_size: file_size || null })
          .select(`*, sender:users!group_messages_sender_id_fkey(id, name, avatar_url)`)
          .single();
        if (error) { console.error("Group message insert error:", error); socket.emit("message_error", { error: "Failed to send message" }); return; }

        // Ensure sender is in the group room (fix for race condition)
        socket.join(`group:${group_id}`);

        // Broadcast to everyone in the group room (includes sender now)
        io.to(`group:${group_id}`).emit("receive_group_message", message);
      } catch (err) { console.error("send_group_message error:", err); socket.emit("message_error", { error: "Server error" }); }
    });

    // ── DELETE DM MESSAGE FOR ME ONLY (receiver side) ──────────────────
    socket.on("delete_dm_message_for_me", ({ messageId, otherUserId }) => {
      // This is client-side only — just acknowledge back to the deleting user
      socket.emit("dm_message_deleted_for_me", { messageId, otherUserId });
    });

    // ── DELETE GROUP MESSAGE FOR ME ONLY (receiver side) ───────────────
    socket.on("delete_group_message_for_me", ({ messageId, groupId }) => {
      socket.emit("group_message_deleted_for_me", { messageId, groupId });
    });

    // ── TYPING INDICATORS (DMs) ────────────────────────────────────────
    socket.on("typing", ({ sender_id, receiver_id }) => {
      const receiverSocketId = onlineUsers.get(receiver_id);
      if (receiverSocketId) io.to(receiverSocketId).emit("typing", { sender_id });
    });

    socket.on("stop_typing", ({ sender_id, receiver_id }) => {
      const receiverSocketId = onlineUsers.get(receiver_id);
      if (receiverSocketId) io.to(receiverSocketId).emit("stop_typing", { sender_id });
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("online_users", Array.from(onlineUsers.keys()));
        console.log(`🔴 User offline: ${socket.userId}`);
      }
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initializeSocket, onlineUsers };
