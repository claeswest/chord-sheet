"use client";

// Sending the finished schedule to the rest of the class.
//
// The link is made here, in the browser, when this opens — there is nothing to
// fetch, because the schedule is the link (see lib/share.ts).
//
// Most of this dialog is a list of what is in it. A parent is about to paste
// something into a chat with thirty people; "share" on its own does not say
// whether their child's name goes along. So it says, with the actual words
// from this sheet: the class and school that go, and the banner that stays.
// If someone wrote the child's name where the class goes, this is where they
// see it before anyone else does.

import { useEffect, useRef, useState } from "react";
import LiveLink from "@/components/LiveLink";
import { copyText } from "@/lib/clipboard";
import { packSchedule, shareUrl } from "@/lib/share";
import type { Glossary } from "@/lib/glossary";
import type { Schedule } from "@/types/schedule";

export default function SharePanel({
  schedule,
  glossary,
  onClose,
  live,
}: {
  schedule: Schedule;
  glossary: Glossary;
  onClose: () => void;
  /**
   * What the second way to share needs to know — see LiveLink. Left out on a
   * site with no accounts, where there is nothing saved for a link to show.
   */
  live?: {
    plan: "free" | "plus" | undefined;
    signedIn: boolean;
    savedId: string | undefined;
    unsaved: boolean;
    saving: boolean;
    onSave: () => void;
  };
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  /** "by-hand": the browser would not copy, so the dialog says how to. */
  const [copied, setCopied] = useState<null | "yes" | "by-hand">(null);
  // Only phones and a few desktops have a share sheet, and it is not known
  // until the page is running in one.
  const [canShare, setCanShare] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setCanShare(typeof navigator.share === "function");
    packSchedule(schedule, glossary)
      .then((payload) => live && setUrl(shareUrl(payload, window.location.href)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [schedule, glossary]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    if (!url) return;
    setCopied((await copyText(url, field.current)) ? "yes" : "by-hand");
  }

  async function send() {
    if (!url) return;
    try {
      await navigator.share({ title: "Klassens schema", url });
    } catch {
      /* closed the share sheet without choosing — not an error */
    }
  }

  const where = [schedule.title, schedule.subtitle].filter(Boolean).join(" · ");
  const heading = schedule.heading?.trim();

  return (
    <div className="overlay no-print" onClick={onClose}>
      <div
        className="dialog share"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="panel-title" id="share-title">
          {live ? "Dela en kopia med klassen" : "Dela schemat med klassen"}
        </p>
        <p className="share-lead">
          Alla i klassen har samma schema. Skicka länken i klasschatten, så slipper de andra fota och
          skriva in namnen – de sätter sitt eget barns namn överst, gör sina val och skriver ut.
        </p>

        <dl className="share-what">
          <dt>Följer med</dt>
          <dd>
            {where && (
              <>
                <strong>{where}</strong>
                <br />
              </>
            )}
            Dagar, tider, ämnen, lärare, salar och anteckningar.
          </dd>
          <dt>Följer inte med</dt>
          <dd>
            {heading ? (
              <>
                Rubriken <strong>{heading}</strong>, era val och er stil.
              </>
            ) : (
              "Era val och er stil."
            )}
          </dd>
        </dl>

        {failed ? (
          <p className="error">Det gick inte att göra en länk här. Prova en annan webbläsare.</p>
        ) : (
          <input
            ref={field}
            className="share-link"
            readOnly
            value={url ?? "Gör länken…"}
            aria-label="Länk till schemat"
            onFocus={(e) => e.target.select()}
          />
        )}

        {copied === "by-hand" && (
          <p className="error" role="status" style={{ margin: "8px 0 0" }}>
            Webbläsaren lät oss inte kopiera. Länken är markerad – kopiera den själv.
          </p>
        )}

        <p className="hint" style={{ margin: "10px 0 0" }}>
          Schemat ligger i själva länken och sparas inte hos oss. Alla som får länken kan läsa det, så
          skicka den bara dit den ska.
        </p>

        <div className="controls" style={{ marginTop: 16, marginBottom: 0 }}>
          {canShare && (
            <button className="primary" onClick={send} disabled={!url}>
              Skicka länken
            </button>
          )}
          <button className={canShare ? "" : "primary"} onClick={copy} disabled={!url}>
            {copied === "yes" ? "Kopierad!" : "Kopiera länken"}
          </button>
          {!live && (
            <button onClick={onClose} style={{ marginLeft: "auto" }}>
              Stäng
            </button>
          )}
        </div>

        {live && (
          <>
            {/* Two ways to share, and they differ in the one way that matters:
                the copy above is frozen the moment it is sent, and this one
                follows the schedule. Kept apart, each under its own heading,
                so nobody takes one for the other. */}
            <LiveLink {...live} />
            <div className="controls" style={{ marginTop: 18, marginBottom: 0 }}>
              <button onClick={onClose} style={{ marginLeft: "auto" }}>
                Stäng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
