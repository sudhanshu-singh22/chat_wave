const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  upsertUser,
} = require("../controllers/userController");

// GET all users (with optional ?search=&exclude= query params)
router.get("/", getUsers);

// GET single user by ID
router.get("/:id", getUserById);

// POST upsert user (called after auth)
router.post("/upsert", upsertUser);

module.exports = router;
