import axios from "axios";

const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const api = axios.create({ baseURL: BASE, headers: { "Content-Type": "application/json" }, timeout: 10000 });

// Attach auth token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── USERS ──────────────────────────────────────────────────────────────────
export const fetchAllUsers = (search = "", excludeId = "") =>
  api.get(`/api/users?search=${search}&exclude=${excludeId}`).then((r) => r.data);

export const fetchUserById = (id) => api.get(`/api/users/${id}`).then((r) => r.data);
export const upsertUserProfile = (payload) => api.post("/api/users/upsert", payload).then((r) => r.data);

// ── MESSAGES ───────────────────────────────────────────────────────────────
export const fetchMessages = (userId1, userId2) =>
  api.get(`/api/messages/${userId1}/${userId2}`).then((r) => r.data);

export const fetchConversations = (userId) =>
  api.get(`/api/messages/conversations/${userId}`).then((r) => r.data);

export const markMessagesRead = (sender_id, receiver_id) =>
  api.patch("/api/messages/read", { sender_id, receiver_id }).then((r) => r.data);

export const deleteMessage = (messageId) =>
  api.delete(`/api/messages/${messageId}`).then((r) => r.data);

export const deleteChat = (otherUserId) =>
  api.delete(`/api/messages/chat/${otherUserId}`).then((r) => r.data);

// ── GROUPS ─────────────────────────────────────────────────────────────────
export const fetchMyGroups = () => api.get("/api/groups").then((r) => r.data);

export const createGroup = (payload) => api.post("/api/groups", payload).then((r) => r.data);

export const fetchGroupMessages = (groupId) =>
  api.get(`/api/groups/${groupId}/messages`).then((r) => r.data);

export const deleteGroupMessage = (groupId, messageId) =>
  api.delete(`/api/groups/${groupId}/messages/${messageId}`).then((r) => r.data);

export const deleteGroupApi = (groupId) => api.delete(`/api/groups/${groupId}`).then((r) => r.data);

export const leaveGroup = (groupId) => api.delete(`/api/groups/${groupId}/leave`).then((r) => r.data);

// ── FILE UPLOAD ────────────────────────────────────────────────────────────
export const uploadFile = (file, userId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("userId", userId);
  const uploadApi = axios.create({ baseURL: BASE, timeout: 60000 });
  const token = localStorage.getItem("sb_token");
  return uploadApi
    .post("/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    .then((r) => r.data);
};

export default api;
