export default function Spinner({ fullscreen = false }) {
  const spinner = (
    <div className="flex items-center justify-center">
      <svg
        className="w-8 h-8 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
        style={{ color: "var(--accent)" }}
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "var(--bg-secondary)" }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
