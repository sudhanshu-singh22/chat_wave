import { create } from "zustand";

const useChatStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────
  users: [],
  conversations: [],
  activeChat: null,       // { id, name, avatar_url, isGroup? }
  messages: {},           // { [dmUserId]: Message[] }
  groupMessages: {},      // { [groupId]: Message[] }
  groups: [],             // array of group objects
  onlineUsers: [],
  typingUsers: {},
  unreadCounts: {},
  darkMode: localStorage.getItem("darkMode") === "true",

  // ── Users ──────────────────────────────────────────────────────────────
  setUsers: (users) => set({ users }),
  setConversations: (conversations) => set({ conversations }),

  setActiveChat: (chat) => {
    set({ activeChat: chat });
    if (chat) set((s) => ({ unreadCounts: { ...s.unreadCounts, [chat.id]: 0 } }));
  },

  // ── DM Messages ────────────────────────────────────────────────────────
  setMessages: (userId, messages) =>
    set((s) => ({ messages: { ...s.messages, [userId]: messages } })),

  appendMessage: (message, currentUserId) => {
    const otherUserId = message.sender_id === currentUserId ? message.receiver_id : message.sender_id;
    set((state) => {
      const existing = state.messages[otherUserId] || [];
      if (existing.find((m) => m.id === message.id)) return state;
      const updated = [...existing, message];
      const isActiveChat = state.activeChat?.id === otherUserId && !state.activeChat?.isGroup;
      const isReceived = message.sender_id !== currentUserId;
      const unreadCounts = { ...state.unreadCounts };
      if (isReceived && !isActiveChat) unreadCounts[otherUserId] = (unreadCounts[otherUserId] || 0) + 1;
      return { messages: { ...state.messages, [otherUserId]: updated }, unreadCounts };
    });
  },

  deleteDmMessage: (messageId, otherUserId) => {
    set((s) => {
      const msgs = s.messages[otherUserId] || [];
      return { messages: { ...s.messages, [otherUserId]: msgs.filter((m) => m.id !== messageId) } };
    });
  },

  // Delete only for the current user locally (receiver-side "delete for me")
  deleteDmMessageForMe: (messageId, otherUserId) => {
    set((s) => {
      const msgs = s.messages[otherUserId] || [];
      return { messages: { ...s.messages, [otherUserId]: msgs.filter((m) => m.id !== messageId) } };
    });
  },

  deleteGroupMessageForMe: (messageId, groupId) => {
    set((s) => {
      const msgs = s.groupMessages[groupId] || [];
      return { groupMessages: { ...s.groupMessages, [groupId]: msgs.filter((m) => m.id !== messageId) } };
    });
  },

  clearDmChat: (otherUserId) => {
    set((s) => ({ messages: { ...s.messages, [otherUserId]: [] } }));
  },

  markMessagesReadInStore: ({ sender_id, receiver_id, read_at }) => {
    set((state) => {
      const convKey = receiver_id;
      const existing = state.messages[convKey];
      if (!existing) return state;
      const updated = existing.map((msg) =>
        msg.sender_id === sender_id && msg.receiver_id === receiver_id && !msg.read_at
          ? { ...msg, read_at }
          : msg
      );
      return { messages: { ...state.messages, [convKey]: updated } };
    });
  },

  // ── Groups ─────────────────────────────────────────────────────────────
  setGroups: (groups) => set({ groups }),

  addGroup: (group) => set((s) => ({ groups: [group, ...s.groups] })),

  removeGroup: (groupId) => {
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== groupId),
      activeChat: s.activeChat?.id === groupId ? null : s.activeChat,
    }));
  },

  // ── Group Messages ─────────────────────────────────────────────────────
  setGroupMessages: (groupId, messages) =>
    set((s) => ({ groupMessages: { ...s.groupMessages, [groupId]: messages } })),

  appendGroupMessage: (message) => {
    const groupId = message.group_id;
    set((state) => {
      const existing = state.groupMessages[groupId] || [];
      // If this is the real message arriving after an optimistic one, remove the optimistic
      const withoutOptimistic = message._optimistic
        ? existing
        : existing.filter((m) => !(m._optimistic && m.sender_id === message.sender_id && m.content === message.content));
      // Deduplicate by real id
      if (!message._optimistic && withoutOptimistic.find((m) => m.id === message.id)) return state;
      const isActive = state.activeChat?.id === groupId && state.activeChat?.isGroup;
      const unreadCounts = { ...state.unreadCounts };
      if (!isActive && !message._optimistic) unreadCounts[groupId] = (unreadCounts[groupId] || 0) + 1;
      return { groupMessages: { ...state.groupMessages, [groupId]: [...withoutOptimistic, message] }, unreadCounts };
    });
  },

  deleteGroupMessageInStore: (messageId, groupId) => {
    set((s) => {
      const msgs = s.groupMessages[groupId] || [];
      return { groupMessages: { ...s.groupMessages, [groupId]: msgs.filter((m) => m.id !== messageId) } };
    });
  },

  // ── Online / Typing ────────────────────────────────────────────────────
  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
  setTyping: (userId, isTyping) => set((s) => ({ typingUsers: { ...s.typingUsers, [userId]: isTyping } })),

  // ── Dark Mode ──────────────────────────────────────────────────────────
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem("darkMode", String(next));
      next ? document.documentElement.classList.add("dark") : document.documentElement.classList.remove("dark");
      return { darkMode: next };
    }),

  initDarkMode: () => {
    const saved = localStorage.getItem("darkMode") === "true";
    if (saved) document.documentElement.classList.add("dark");
    set({ darkMode: saved });
  },
}));

export default useChatStore;
