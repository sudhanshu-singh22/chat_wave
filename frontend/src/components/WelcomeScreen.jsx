export default function WelcomeScreen() {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center select-none"
      style={{ background: "var(--bg-chat)" }}
    >
      <div className="text-center px-8 max-w-sm">
        {/* Icon */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--header-bg)" }}
        >
          <svg viewBox="0 0 24 24" fill="var(--accent)" className="w-12 h-12">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </div>

        <h2 className="text-2xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          ChatWave
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Select a conversation from the sidebar or search for a user to start chatting.
        </p>

        <div
          className="mt-6 inline-flex items-center gap-2 text-xs px-4 py-2 rounded-full"
          style={{ background: "var(--header-bg)", color: "var(--text-muted)" }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          </svg>
          End-to-end encrypted
        </div>
      </div>
    </div>
  );
}
