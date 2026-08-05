"use client";

import { useRef, useState } from "react";
import Link from "next/link";

interface UserMenuProps {
  userName?: string | null;
  userImage?: string | null;
}

export default function UserMenu({ userName, userImage }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-0.5 hover:bg-white/10 transition-colors"
      >
        {userImage && !imgError
          ? <img src={userImage} alt={userName ?? ""} referrerPolicy="no-referrer" onError={() => setImgError(true)} className="w-7 h-7 rounded-full ring-1 ring-white/20" />
          : <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">{userName?.[0]}</div>
        }
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
          className={`w-3.5 h-3.5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M12 16l-6-6h12l-6 6Z"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-zinc-200 py-1.5 z-50">
            <div className="px-3 py-2 border-b border-zinc-100 mb-1">
              <p className="text-xs font-medium text-zinc-800 truncate">{userName}</p>
            </div>
            <Link href="/songs" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400">
                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/>
              </svg>
              Songs
            </Link>
            <Link href="/account" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4Z"/>
              </svg>
              Account
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-zinc-400">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4Z"/>
              </svg>
              Pricing
            </Link>
            <div className="border-t border-zinc-100 mt-1 pt-1">
              <a href="/api/auth/signout"
                className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M17 8l-1.41 1.41L17.17 11H9v2h8.17l-1.58 1.58L17 16l4-4-4-4ZM5 5h7V3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h7v-2H5V5Z"/>
                </svg>
                Sign out
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
