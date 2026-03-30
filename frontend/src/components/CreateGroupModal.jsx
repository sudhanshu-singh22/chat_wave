import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAllUsers, createGroup } from "../services/api";
import Avatar from "./Avatar";
import { getSocket } from "../socket/socket";

export default function CreateGroupModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (search.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await fetchAllUsers(search, user.id);
        setSearchResults(results.filter((u) => !selected.find((s) => s.id === u.id)));
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, selected, user.id]);

  const toggleUser = (u) => {
    setSelected((prev) =>
      prev.find((s) => s.id === u.id) ? prev.filter((s) => s.id !== u.id) : [...prev, u]
    );
    setSearch("");
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Group name is required"); return; }
    if (selected.length === 0) { setError("Add at least one member"); return; }
    setCreating(true);
    setError("");
    try {
      const group = await createGroup({
        name: name.trim(),
        member_ids: selected.map((u) => u.id),
      });
      // Join the group socket room
      const socket = getSocket();
      socket.emit("join_group", group.id);
      onCreated(group);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-color)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>New Group</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:opacity-70" style={{ color: "var(--text-muted)" }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Group name */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-muted)" }}>GROUP NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Alpha"
              className="w-full px-4 py-2.5 rounded-xl text-sm"
              style={{ background: "var(--header-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", outline: "none" }}
            />
          </div>

          {/* Selected members chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: "var(--accent-light)", color: "var(--accent)" }}
                >
                  <span>{u.name || u.email}</span>
                  <button onClick={() => toggleUser(u)} className="hover:opacity-70">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search members */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: "var(--text-muted)" }}>ADD MEMBERS</label>
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"
                style={{ background: "var(--header-bg)", color: "var(--text-primary)", border: "1px solid var(--border-color)", outline: "none" }}
              />
              {searching && (
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: "var(--text-muted)" }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-color)" }}>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:opacity-80 transition-opacity text-left"
                    style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border-color)" }}
                  >
                    <Avatar name={u.name || "?"} url={u.avatar_url} size={34} showOnline={false} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{u.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</p>
                    </div>
                    <div className="ml-auto">
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim() || selected.length === 0}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: (!creating && name.trim() && selected.length > 0) ? "var(--accent)" : "var(--border-color)",
              color: "white",
              cursor: (!creating && name.trim() && selected.length > 0) ? "pointer" : "default",
            }}
          >
            {creating ? "Creating..." : `Create Group${selected.length > 0 ? ` (${selected.length + 1} members)` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
