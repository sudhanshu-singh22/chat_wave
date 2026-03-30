const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authenticate");
const {
  createGroup, getMyGroups, getGroupMessages,
  deleteGroupMessage, deleteGroup, leaveGroup,
} = require("../controllers/groupController");

router.use(authenticate);

router.post("/", createGroup);
router.get("/", getMyGroups);
router.get("/:groupId/messages", getGroupMessages);
router.delete("/:groupId/messages/:messageId", deleteGroupMessage);
router.delete("/:groupId/leave", leaveGroup);
router.delete("/:groupId", deleteGroup);

module.exports = router;
