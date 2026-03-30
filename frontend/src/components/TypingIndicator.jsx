export default function TypingIndicator({ name }) {
  return (
    <div className="flex justify-start mb-1 animate-fade-in">
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1"
        style={{ background: "var(--bubble-received)" }}
      >
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}
