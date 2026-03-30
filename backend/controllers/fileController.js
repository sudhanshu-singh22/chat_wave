const supabase = require("../services/supabaseClient");
const path = require("path");
const crypto = require("crypto");

// POST /api/upload — upload file to Supabase Storage
const uploadFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file provided" });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${fileExt}`;
    const bucket = "chat-files";
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase
      .storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ error: "Failed to upload file" });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from(bucket)
      .getPublicUrl(filePath);

    return res.json({
      file_url: urlData.publicUrl,
      file_name: file.originalname,
      file_type: file.mimetype,
      file_size: file.size,
    });
  } catch (err) {
    console.error("uploadFile exception:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { uploadFile };
