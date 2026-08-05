/**
 * Bouncing musical notes loading animation.
 * Used as a Suspense fallback and as the SongViewer background-image overlay.
 */
export default function LoadingNotes({
  label = "Loading…",
  overlay = false,
}: {
  label?: string;
  overlay?: boolean;
}) {
  const notes = (
    <>
      <div className="flex items-end gap-2">
        {(["♩", "♫", "♪", "♬", "♩"] as const).map((note, i) => (
          <span
            key={i}
            className="text-indigo-300 select-none leading-none"
            style={{
              fontSize: [44, 56, 44, 64, 44][i],
              animation: "noteJump 1.1s ease-in-out infinite",
              animationDelay: `${i * 0.18}s`,
              display: "inline-block",
            }}
          >
            {note}
          </span>
        ))}
      </div>
      <span className="text-sm text-zinc-400 tracking-wide mt-2">{label}</span>
      <style>{`@keyframes noteJump{0%,100%{transform:translateY(0);opacity:0.5}40%{transform:translateY(-10px);opacity:1}60%{transform:translateY(-6px);opacity:0.9}}`}</style>
    </>
  );

  if (overlay) {
    // Inline overlay version — caller controls positioning/z-index
    return <div className="flex flex-col items-center justify-center gap-1">{notes}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-1">
      {notes}
    </div>
  );
}
