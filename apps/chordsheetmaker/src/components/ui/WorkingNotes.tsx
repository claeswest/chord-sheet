/**
 * Three notes rising one after another, with a line saying what is being
 * waited for. With reduced motion the notes stand still.
 *
 * It began in the import dialog, for the wait while the AI finds a song, and
 * is shared so that the library's wait looks the same. The older, larger
 * LoadingNotes is still what the editor and the song view show.
 */
export default function WorkingNotes({
  title,
  detail,
  className = "",
}: {
  title: string;
  detail?: string;
  /** Room around it: the caller knows what it sits in. */
  className?: string;
}) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-2 text-center ${className}`}>
      <style>{`
        @keyframes note-rise { 0%, 100% { transform: translateY(0); opacity: .35 } 40% { transform: translateY(-7px); opacity: 1 } }
        .note-rise { display: inline-block; animation: note-rise 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .note-rise { animation: none; opacity: 1 } }
      `}</style>
      <div aria-hidden className="flex gap-2 text-2xl text-chord mb-2">
        {["♪", "♫", "♪"].map((note, i) => (
          <span key={i} className="note-rise" style={{ animationDelay: `${i * 0.18}s` }}>{note}</span>
        ))}
      </div>
      <p className="font-display text-xl text-ink">{title}</p>
      {detail && <p className="text-sm text-stone-500">{detail}</p>}
    </div>
  );
}
