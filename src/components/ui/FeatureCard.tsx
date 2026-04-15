"use client";

import { useState } from "react";

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  hex: string;
  iconBg: string;
  cardBg: string;
  glow: string;
}

export default function FeatureCard({ icon, title, description, hex, iconBg, cardBg, glow }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative rounded-2xl p-5 sm:p-7 border border-white/80 hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-default"
      style={{
        background: `linear-gradient(135deg, #ffffff 60%, ${cardBg})`,
        boxShadow: hovered
          ? `0 8px 30px ${glow}, 0 2px 8px rgba(0,0,0,0.06)`
          : "0 1px 4px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thin left accent border */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-60"
        style={{ background: hex }}
      />

      {/* Icon + title row */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-11 h-11 flex items-center justify-center rounded-xl text-xl shrink-0 transition-transform duration-200 ${hovered ? "scale-110" : ""}`}
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <h3 className="font-bold text-zinc-900 text-base leading-snug">{title}</h3>
      </div>

      <p className="text-[15px] text-zinc-500 leading-relaxed mt-1">{description}</p>
    </div>
  );
}
