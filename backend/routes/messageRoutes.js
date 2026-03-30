const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const { getMessages, getConversations, markAsRead, deleteMessage, deleteChat } = require("../controllers/messageController");

router.get("/conversations/:userId", getConversations);
router.patch("/read", markAsRead);
router.delete("/chat/:otherUserId", authenticate, deleteChat);
router.delete("/:messageId", authenticate, deleteMessage);
router.get("/:userId1/:userId2", getMessages);

module.exports = router;
