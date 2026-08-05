export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-extrabold tracking-tight ${className}`}
      style={{ fontFamily: "var(--font-nunito)" }}
    >
      ChordSheet<span className="text-indigo-400">Maker</span>
    </span>
  );
}
