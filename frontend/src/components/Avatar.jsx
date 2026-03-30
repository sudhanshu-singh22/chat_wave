const COLORS = [
  "#d97706", "#dc2626", "#7c3aed", "#2563eb",
  "#059669", "#db2777", "#0891b2", "#65a30d",
];

function getColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function Avatar({ name = "", url = null, size = 40, showOnline = false, isOnline = false }) {
  const bg = getColor(name);
  const initials = getInitials(name);

  return (
    <div className="relative inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt={name}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
          onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
        />
      ) : null}
      <div
        className="rounded-full flex items-center justify-center font-semibold select-none"
        style={{
          width: size,
          height: size,
          background: bg,
          color: "white",
          fontSize: size * 0.38,
          display: url ? "none" : "flex",
        }}
      >
        {initials}
      </div>
      {showOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-white"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: isOnline ? "var(--online)" : "var(--text-muted)",
          }}
        />
      )}
    </div>
  );
}
