const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../controllers/fileController");

const router = express.Router();

// Configure multer for in-memory file handling
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    // Block executable files
    const blockedExt = [".exe", ".bat", ".cmd", ".sh", ".app", ".dmg"];
    const ext = require("path").extname(file.originalname).toLowerCase();
    if (blockedExt.includes(ext)) {
      return cb(new Error("File type not allowed"));
    }
    cb(null, true);
  },
});

// POST /api/upload — upload file
router.post("/", upload.single("file"), uploadFile);

module.exports = router;
