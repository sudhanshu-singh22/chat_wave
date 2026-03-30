const supabase = require("../services/supabaseClient");

// GET /api/users — search users
const getUsers = async (req, res) => {
  const { search, exclude } = req.query;

  try {
    if (!search || search.trim().length < 2) {
      return res.json([]);
    }

    const searchTerm = search.trim();

    let query = supabase
      .from("users")
      .select("id, name, email, avatar_url, quote, created_at");

    query = query.or(
      `email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`
    );

    if (exclude) {
      query = query.neq("id", exclude);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("getUsers error:", error);
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    return res.json(data || []);
  } catch (err) {
    console.error("getUsers exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// GET /api/users/:id — get single user profile
const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, avatar_url, quote, created_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(data);
  } catch (err) {
    console.error("getUserById exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// POST /api/users/upsert — create or update user profile
const upsertUser = async (req, res) => {
  const { id, name, email, avatar_url, quote } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: "id and email are required" });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          id,
          name: name || email.split("@")[0],
          email,
          avatar_url: avatar_url || null,
          quote: quote !== undefined ? quote : null,
        },
        { onConflict: "id" }
      )
      .select("id, name, email, avatar_url, quote, created_at")
      .single();

    if (error) {
      console.error("upsertUser error:", error);
      return res.status(500).json({ error: "Failed to upsert user" });
    }

    return res.json(data);
  } catch (err) {
    console.error("upsertUser exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getUsers, getUserById, upsertUser };