const supabase = require("../services/supabaseClient");
const { onlineUsers } = require("../socket/socketHandler");

// ── POST /api/groups — Create a new group ─────────────────────────────────
const createGroup = async (req, res) => {
  const { name, avatar_url, member_ids } = req.body;
  const creatorId = req.user?.id;

  if (!creatorId) return res.status(401).json({ error: "Unauthorized" });
  if (!name?.trim()) return res.status(400).json({ error: "Group name is required" });

  try {
    // 1. Create group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({ name: name.trim(), avatar_url: avatar_url || null, created_by: creatorId })
      .select()
      .single();

    if (groupError) {
      console.error("createGroup error:", groupError);
      return res.status(500).json({ error: "Failed to create group" });
    }

    // 2. Add creator as admin + all invited members
    const allMemberIds = [creatorId, ...(member_ids || []).filter((id) => id !== creatorId)];
    const memberRows = allMemberIds.map((uid) => ({
      group_id: group.id,
      user_id: uid,
      role: uid === creatorId ? "admin" : "member",
    }));

    const { error: memberError } = await supabase.from("group_members").insert(memberRows);
    if (memberError) {
      console.error("addMembers error:", memberError);
      return res.status(500).json({ error: "Group created but failed to add members" });
    }

    // 3. Fetch full group with members
    const fullGroup = await fetchGroupWithMembers(group.id);
    return res.status(201).json(fullGroup);
  } catch (err) {
    console.error("createGroup exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── GET /api/groups — Get all groups for the current user ─────────────────
const getMyGroups = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data, error } = await supabase
      .from("group_members")
      .select(`
        group:groups(
          id, name, avatar_url, created_by, created_at,
          group_members(
            id, user_id, role, joined_at,
            user:users(id, name, avatar_url, email)
          )
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("getMyGroups error:", error);
      return res.status(500).json({ error: "Failed to fetch groups" });
    }

    const groups = data.map((row) => row.group).filter(Boolean);
    return res.json(groups);
  } catch (err) {
    console.error("getMyGroups exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── GET /api/groups/:groupId/messages — Fetch group messages ──────────────
const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  try {
    // Verify membership
    const { data: member } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .single();

    if (!member) return res.status(403).json({ error: "Not a member of this group" });

    const { data, error } = await supabase
      .from("group_messages")
      .select(`
        *,
        sender:users!group_messages_sender_id_fkey(id, name, avatar_url)
      `)
      .eq("group_id", groupId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("getGroupMessages error:", error);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }

    return res.json(data || []);
  } catch (err) {
    console.error("getGroupMessages exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── DELETE /api/groups/:groupId/messages/:messageId — Soft-delete group message
const deleteGroupMessage = async (req, res) => {
  const { groupId, messageId } = req.params;
  const userId = req.user?.id;

  try {
    const { data: msg, error: fetchErr } = await supabase
      .from("group_messages")
      .select("sender_id, group_id")
      .eq("id", messageId)
      .single();

    if (fetchErr || !msg) return res.status(404).json({ error: "Message not found" });
    if (msg.sender_id !== userId) return res.status(403).json({ error: "Not your message" });

    const { error } = await supabase
      .from("group_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);

    if (error) return res.status(500).json({ error: "Failed to delete message" });

    // Notify group members via socket
    if (req.io) {
      req.io.to(`group:${groupId}`).emit("group_message_deleted", { messageId, groupId });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteGroupMessage exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── DELETE /api/groups/:groupId — Delete entire group (admin only) ────────
const deleteGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  try {
    const { data: group } = await supabase
      .from("groups")
      .select("created_by")
      .eq("id", groupId)
      .single();

    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.created_by !== userId) return res.status(403).json({ error: "Only the group creator can delete it" });

    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) return res.status(500).json({ error: "Failed to delete group" });

    if (req.io) {
      req.io.to(`group:${groupId}`).emit("group_deleted", { groupId });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteGroup exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ── DELETE /api/groups/:groupId/leave — Leave a group ────────────────────
const leaveGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user?.id;

  try {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) return res.status(500).json({ error: "Failed to leave group" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};

// ── Helper ─────────────────────────────────────────────────────────────────
async function fetchGroupWithMembers(groupId) {
  const { data } = await supabase
    .from("groups")
    .select(`
      id, name, avatar_url, created_by, created_at,
      group_members(id, user_id, role, joined_at,
        user:users(id, name, avatar_url, email)
      )
    `)
    .eq("id", groupId)
    .single();
  return data;
}

module.exports = { createGroup, getMyGroups, getGroupMessages, deleteGroupMessage, deleteGroup, leaveGroup };
