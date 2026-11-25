import { LANDING_FONTS } from "@/components/landing/fonts";

/**
 * Three notes rising one after another, with a line saying what is being
 * waited for. With reduced motion the notes stand still.
 *
 * This is the one waiting animation in the app: the library, the editor, the
 * song view and the AI import all show this component, so a change here shows
 * everywhere. (There used to be a second, larger one, LoadingNotes.)
 *
 * It brings its own typefaces: some of the places it stands in — a page that
 * has not loaded yet — have nothing around them that switches the display
 * face on, and the line of text would fall back to Arial there.
 */
export default function WorkingNotes({
  title,
  detail,
  className = "",
  onDark = false,
}: {
  title: string;
  detail?: string;
  /** Room around it: the caller knows what it sits in. `h-screen` fills a page. */
  className?: string;
  /** Over a dark surface, such as the song view's overlay while its picture loads. */
  onDark?: boolean;
}) {
  return (
    <div role="status" className={`${LANDING_FONTS} flex flex-col items-center justify-center gap-2 text-center ${className}`}>
      <style>{`
        @keyframes note-rise { 0%, 100% { transform: translateY(0); opacity: .35 } 40% { transform: translateY(-7px); opacity: 1 } }
        .note-rise { display: inline-block; animation: note-rise 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .note-rise { animation: none; opacity: 1 } }
      `}</style>
      <div aria-hidden className={`flex gap-2 text-2xl mb-2 ${onDark ? "text-chord-light" : "text-chord"}`}>
        {["♪", "♫", "♪"].map((note, i) => (
          <span key={i} className="note-rise" style={{ animationDelay: `${i * 0.18}s` }}>{note}</span>
        ))}
      </div>
      <p className={`font-display text-xl ${onDark ? "text-white/90" : "text-ink"}`}>{title}</p>
      {detail && <p className={`text-sm ${onDark ? "text-white/60" : "text-stone-500"}`}>{detail}</p>}
    </div>
  );
}
