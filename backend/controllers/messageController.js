const supabase = require("../services/supabaseClient");
const { onlineUsers } = require("../socket/socketHandler");

// GET /api/messages/:userId1/:userId2 — fetch chat history between two users
const getMessages = async (req, res) => {
  const { userId1, userId2 } = req.params;
  if (!userId1 || !userId2) return res.status(400).json({ error: "Both user IDs are required" });
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(`*, sender:users!messages_sender_id_fkey(id, name, avatar_url), receiver:users!messages_receiver_id_fkey(id, name, avatar_url)`)
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) { console.error("getMessages error:", error); return res.status(500).json({ error: "Failed to fetch messages" }); }
    return res.json(data || []);
  } catch (err) { console.error("getMessages exception:", err); return res.status(500).json({ error: "Server error" }); }
};

// GET /api/messages/conversations/:userId
const getConversations = async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "User ID is required" });
  try {
    const { data, error } = await supabase
      .from("messages")
      .select(`*, sender:users!messages_sender_id_fkey(id, name, avatar_url, email), receiver:users!messages_receiver_id_fkey(id, name, avatar_url, email)`)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) { console.error("getConversations error:", error); return res.status(500).json({ error: "Failed to fetch conversations" }); }
    const conversationMap = new Map();
    for (const msg of data || []) {
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
      const otherId = otherUser?.id;
      if (!otherId) continue;
      if (!conversationMap.has(otherId)) conversationMap.set(otherId, { user: otherUser, lastMessage: msg, unreadCount: 0 });
      if (msg.receiver_id === userId && !msg.read_at) conversationMap.get(otherId).unreadCount += 1;
    }
    return res.json(Array.from(conversationMap.values()));
  } catch (err) { console.error("getConversations exception:", err); return res.status(500).json({ error: "Server error" }); }
};

// PATCH /api/messages/read
const markAsRead = async (req, res) => {
  const { sender_id, receiver_id } = req.body;
  if (!sender_id || !receiver_id) return res.status(400).json({ error: "sender_id and receiver_id required" });
  try {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("messages").update({ read_at: readAt }).eq("sender_id", sender_id).eq("receiver_id", receiver_id).is("read_at", null);
    if (error) { console.error("markAsRead error:", error); return res.status(500).json({ error: "Failed to mark as read" }); }
    const senderSocketId = onlineUsers.get(sender_id);
    if (senderSocketId && req.io) req.io.to(senderSocketId).emit("messages_read", { sender_id, receiver_id, read_at: readAt });
    return res.json({ success: true });
  } catch (err) { console.error("markAsRead exception:", err); return res.status(500).json({ error: "Server error" }); }
};

// DELETE /api/messages/:messageId — soft-delete a single DM message
const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { data: msg, error: fetchErr } = await supabase.from("messages").select("sender_id, receiver_id").eq("id", messageId).single();
    if (fetchErr || !msg) return res.status(404).json({ error: "Message not found" });
    if (msg.sender_id !== userId) return res.status(403).json({ error: "You can only delete your own messages" });
    const { error } = await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", messageId);
    if (error) return res.status(500).json({ error: "Failed to delete message" });
    const receiverSocketId = onlineUsers.get(msg.receiver_id);
    if (receiverSocketId && req.io) req.io.to(receiverSocketId).emit("message_deleted", { messageId, receiver_id: msg.receiver_id });
    return res.json({ success: true });
  } catch (err) { console.error("deleteMessage exception:", err); return res.status(500).json({ error: "Server error" }); }
};

// DELETE /api/messages/chat/:otherUserId — soft-delete entire DM conversation
const deleteChat = async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .is("deleted_at", null);
    if (error) { console.error("deleteChat error:", error); return res.status(500).json({ error: "Failed to delete chat" }); }
    return res.json({ success: true });
  } catch (err) { console.error("deleteChat exception:", err); return res.status(500).json({ error: "Server error" }); }
};

module.exports = { getMessages, getConversations, markAsRead, deleteMessage, deleteChat };
