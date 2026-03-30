import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import useChatStore from "../context/chatStore";
import { fetchAllUsers, fetchMyGroups } from "../services/api";
import Avatar from "./Avatar";
import ProfileModal from "./ProfileModal";
import CreateGroupModal from "./CreateGroupModal";
import { formatDistanceToNow } from "date-fns";

export default function Sidebar() {
  const { user, profile, signOut } = useAuth();
  const {
    users, setUsers, conversations, activeChat, setActiveChat,
    onlineUsers, unreadCounts, darkMode, toggleDarkMode,
    groups, setGroups, addGroup,
  } = useChatStore();

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [tab, setTab] = useState("chats"); // "chats" | "groups" | "users"
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Load groups on mount
  useEffect(() => {
    if (!user) return;
    fetchMyGroups()
      .then(setGroups)
      .catch((err) => console.error("fetchMyGroups error:", err));
  }, [user]);

  // Search users
  useEffect(() => {
    if (!user) return;
    if (search.trim().length < 2) { setUsers([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchAllUsers(search, user.id);
        setUsers(results);
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  const handleSelectUser = (u) => {
    setActiveChat({ ...u, isGroup: false });
    setSearch("");
    setTab("chats");
  };

  const handleSelectGroup = (g) => {
    setActiveChat({ id: g.id, name: g.name, avatar_url: g.avatar_url, isGroup: true, members: g.group_members, created_by: g.created_by });
    // clear unread
    useChatStore.setState((s) => ({ unreadCounts: { ...s.unreadCounts, [g.id]: 0 } }));
  };

  const handleGroupCreated = (group) => {
    addGroup(group);
    handleSelectGroup(group);
    setTab("groups");
  };

  const tabs = ["chats", "groups", "users"];

  return (
    // REPLACE with:
<div
  className="flex flex-col w-full md:w-[380px] md:min-w-[320px] md:max-w-[420px] border-r h-full flex-shrink-0"
  style={{ background: "var(--sidebar-bg)", borderColor: "var(--border-color)" }}
>
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--header-bg)" }}>
        <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar name={profile?.name || user?.name || "U"} url={profile?.avatar_url || user?.avatar_url} size={40} showOnline={false} />
          <div className="text-left">
            <span className="font-semibold text-sm block" style={{ color: "var(--text-primary)" }}>
              {profile?.name || user?.name || "Me"}
            </span>
            {(profile?.quote || user?.quote) && (
              <span className="text-xs block max-w-[160px] truncate" style={{ color: "var(--text-muted)" }}>
                "{profile?.quote || user?.quote}"
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center gap-1">
          {/* Dark mode toggle */}
          <button onClick={toggleDarkMode} className="p-2 rounded-full hover:opacity-80" style={{ color: "var(--text-muted)" }} title="Toggle dark mode">
            {darkMode ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>
            )}
          </button>

          {/* Menu */}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:opacity-80" style={{ color: "var(--text-muted)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 w-48 rounded-xl shadow-lg z-50 py-1" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)" }}>
                <button onClick={() => { setShowProfile(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80" style={{ color: "var(--text-primary)" }}>
                  ✏️ Edit Profile
                </button>
                <button onClick={() => { setShowCreateGroup(true); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80" style={{ color: "var(--text-primary)" }}>
                  👥 New Group
                </button>
                <button onClick={() => { signOut(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80" style={{ color: "var(--text-primary)" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────── */}
      <div className="px-3 py-2" style={{ background: "var(--sidebar-bg)" }}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (e.target.value.length >= 2) setTab("users"); }}
            placeholder="Search by name or email"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg"
            style={{ background: "var(--header-bg)", color: "var(--text-primary)", border: "none", outline: "none" }}
          />
          {searching && (
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "var(--text-muted)" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex border-b" style={{ borderColor: "var(--border-color)" }}>
        {tabs.map((t) => {
          const label = t === "chats" ? "Chats" : t === "groups" ? "Groups" : "Users";
          const groupUnread = t === "groups"
            ? groups.reduce((sum, g) => sum + (unreadCounts[g.id] || 0), 0)
            : 0;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative"
              style={{
                color: tab === t ? "var(--accent)" : "var(--text-muted)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {label}
              {groupUnread > 0 && t === "groups" && (
                <span className="absolute top-1.5 right-3 text-[10px] font-bold text-white w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--unread-badge)" }}>
                  {groupUnread > 9 ? "9+" : groupUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── List ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Groups tab with "+ New Group" button */}
        {tab === "groups" && (
          <button
            onClick={() => setShowCreateGroup(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity"
            style={{ borderBottom: "1px solid var(--border-color)", color: "var(--accent)" }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-light)" }}>
              <svg viewBox="0 0 24 24" fill="var(--accent)" className="w-5 h-5"><path d="M12 4v16m8-8H4" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg>
            </div>
            <span className="text-sm font-semibold">New Group</span>
          </button>
        )}

        {/* Chats list */}
        {tab === "chats" && conversations.length === 0 && (
          <EmptyState text="No conversations yet" />
        )}
        {tab === "chats" && conversations.map(({ user: u, lastMessage, unreadCount }) => {
          const isActive = activeChat?.id === u?.id && !activeChat?.isGroup;
          const isOnline = onlineUsers.includes(u?.id);
          const unread = unreadCounts[u?.id] || unreadCount || 0;
          return (
            <SidebarItem
              key={u?.id}
              isActive={isActive}
              onClick={() => handleSelectUser(u)}
              avatar={<div className="relative flex-shrink-0"><Avatar name={u?.name || "?"} url={u?.avatar_url} size={48} showOnline={false} />{isOnline && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2" style={{ background: "var(--online)", borderColor: isActive ? "var(--header-bg)" : "var(--sidebar-bg)" }} />}</div>}
              title={u?.name || u?.email}
              subtitle={lastMessage?.file_url && !lastMessage?.content ? "📎 File" : lastMessage?.content || u?.email}
              time={lastMessage ? formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: false }) : null}
              unread={unread}
            />
          );
        })}

        {/* Groups list */}
        {tab === "groups" && groups.length === 0 && (
          <EmptyState text="No groups yet. Create one!" />
        )}
        {tab === "groups" && groups.map((g) => {
          const isActive = activeChat?.id === g.id && activeChat?.isGroup;
          const unread = unreadCounts[g.id] || 0;
          const memberCount = g.group_members?.length || 0;
          return (
            <SidebarItem
              key={g.id}
              isActive={isActive}
              onClick={() => handleSelectGroup(g)}
              avatar={
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold text-white" style={{ background: "var(--accent)" }}>
                  {g.name?.[0]?.toUpperCase() || "G"}
                </div>
              }
              title={g.name}
              subtitle={`${memberCount} member${memberCount !== 1 ? "s" : ""}`}
              time={null}
              unread={unread}
            />
          );
        })}

        {/* Users search list */}
        {tab === "users" && (
          users.length === 0 ? (
            <EmptyState text={search.trim().length < 2 ? "Enter at least 2 characters to search" : "No users found"} />
          ) : (
            users.map((u) => (
              <SidebarItem
                key={u.id}
                isActive={false}
                onClick={() => handleSelectUser(u)}
                avatar={<Avatar name={u?.name || "?"} url={u?.avatar_url} size={48} showOnline={false} />}
                title={u?.name || u?.email}
                subtitle={u?.email}
                time={null}
                unread={0}
              />
            ))
          )
        )}
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </div>
  );
}

function SidebarItem({ isActive, onClick, avatar, title, subtitle, time, unread }) {
  return (
    <div
      onClick={onClick}
      className="sidebar-item flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
      style={{ background: isActive ? "var(--header-bg)" : "transparent", borderBottom: "1px solid var(--border-color)" }}
    >
      {avatar}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{title}</span>
          {time && <span className="text-xs flex-shrink-0 ml-1" style={{ color: "var(--text-muted)" }}>{time}</span>}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs truncate max-w-[180px]" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
          {unread > 0 && (
            <span className="flex-shrink-0 ml-1 text-xs font-semibold text-white rounded-full w-5 h-5 flex items-center justify-center" style={{ background: "var(--unread-badge)" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2" style={{ color: "var(--text-muted)" }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-30"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <p className="text-sm">{text}</p>
    </div>
  );
}
