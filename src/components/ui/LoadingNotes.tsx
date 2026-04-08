/**
 * Bouncing musical notes loading animation.
 * Used as a Suspense fallback on the Edit and Play pages.
 */
export default function LoadingNotes({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-5">
      <div className="flex items-end gap-3">
        {[0, 1, 2].map((i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7 text-indigo-300"
            style={{
              animation: "noteJump 1.1s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
            }}
          >
            <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9Z" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-zinc-400 tracking-wide">{label}</span>
      <style>{`@keyframes noteJump{0%,100%{transform:translateY(0);opacity:0.5}40%{transform:translateY(-10px);opacity:1}60%{transform:translateY(-6px);opacity:0.9}}`}</style>
    </div>
  );
}
