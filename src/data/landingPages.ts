// SEO marketing landing pages.
// Each entry becomes a statically-generated page at /<slug> with its own
// <title>/meta description, keyword-focused copy and a CTA to the app.
// These target organic search traffic — logged-in users never see them.

export interface LandingSection {
  heading: string;
  body: string;
}

export interface LandingFaq {
  q: string;
  a: string;
}

export interface LandingPage {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  h1Accent: string; // highlighted tail of the headline
  intro: string;
  sections: LandingSection[];
  faqs: LandingFaq[];
  ctaHeading: string;
  ctaBody: string;
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "chord-sheet-maker",
    metaTitle: "Chord Sheet Maker — Create Chord Sheets Online Free",
    metaDescription:
      "The easiest chord sheet maker online. Search any song with AI, drag chords above the lyrics, and perform with hands-free auto-scroll. Start free — no credit card.",
    eyebrow: "Free chord sheet maker",
    h1: "The chord sheet maker built",
    h1Accent: "for real musicians",
    intro:
      "ChordSheetMaker is a free online chord sheet maker that turns any song into a clean, playable chord sheet in seconds. Type a title, let AI find the chords, then drag each chord exactly where it falls above the lyrics — no fiddly spacing, no clunky text files.",
    sections: [
      {
        heading: "Make a chord sheet in seconds",
        body: "Search for any song by name and our AI builds a complete chord sheet for you — chords aligned over the right syllables, sections labelled, ready to play. Tweak anything with a click.",
      },
      {
        heading: "Drag-and-drop chord placement",
        body: "Grab a chord and drop it above the exact beat where the change happens. What you see is what you play — perfectly spaced on every device, every screen size.",
      },
      {
        heading: "Perform hands-free",
        body: "Hit play and your chord sheet scrolls at your pace like a teleprompter. Adjust the speed, bump the font size, and keep both hands on your instrument while you play.",
      },
      {
        heading: "Style it your way",
        body: "Generate atmospheric AI backgrounds, choose fonts and colours, transpose to any key, and export a clean PDF for your binder or your band.",
      },
    ],
    faqs: [
      {
        q: "Is the chord sheet maker free?",
        a: "Yes. You can create your first chord sheets free with no credit card. Upgrade to Pro any time for unlimited songs, PDF export and sharing.",
      },
      {
        q: "Does it work on phones and tablets?",
        a: "Absolutely. ChordSheetMaker runs in any browser, so you can build a chord sheet on your laptop and perform from your phone or tablet — your songs sync automatically.",
      },
      {
        q: "Can the AI find the chords for any song?",
        a: "Type a song title and our AI builds a complete chord sheet in seconds, with chords aligned over the lyrics. You can then tweak any chord with a single click.",
      },
      {
        q: "Can I transpose a song to a different key?",
        a: "Yes. Transpose any chord sheet up or down with one tap and every chord moves with it — ideal for matching a singer's range.",
      },
    ],
    ctaHeading: "Make your first chord sheet free",
    ctaBody: "Start with 5 songs free — no credit card required. Upgrade any time for unlimited songs, PDF export and sharing.",
  },
  {
    slug: "guitar-chord-sheets",
    metaTitle: "Guitar Chord Sheets — Make & Play Chord Sheets Online",
    metaDescription:
      "Create guitar chord sheets online in seconds. AI finds the chords, you drag them above the lyrics, then play along with auto-scroll. Free to start, works on any device.",
    eyebrow: "For guitarists",
    h1: "Guitar chord sheets,",
    h1Accent: "made effortless",
    intro:
      "Build beautiful guitar chord sheets without wrestling with text editors. ChordSheetMaker finds the chords for any song, lets you place them precisely above the lyrics, and scrolls hands-free while you play.",
    sections: [
      {
        heading: "Chords above every lyric — perfectly aligned",
        body: "Drop chords exactly where the change lands. Capo and transpose tools let you move any song into a key that suits your voice and your open-chord shapes.",
      },
      {
        heading: "From your couch to the stage",
        body: "Auto-scroll keeps your hands on the fretboard. Adjust speed on the fly and read comfortably from a phone, tablet or laptop on your music stand.",
      },
      {
        heading: "Snap a photo of your old chord sheets",
        body: "Got a binder full of handwritten guitar tabs and chords? Take a photo and our AI turns it into a clean, editable digital chord sheet.",
      },
      {
        heading: "Transpose for any singer",
        body: "Change the key with one tap and every chord moves with it — perfect when a song sits too high or too low for the vocalist.",
      },
    ],
    faqs: [
      {
        q: "Can I make guitar chord sheets for free?",
        a: "Yes — start free with no credit card. Build your first guitar chord sheets and upgrade for unlimited songs and PDF export whenever you're ready.",
      },
      {
        q: "Can I add a capo or transpose for my voice?",
        a: "Yes. Transpose any song up or down with one tap, or use the capo tool to keep easy open-chord shapes while changing the key.",
      },
      {
        q: "Can I import chord sheets I already have?",
        a: "You can paste existing lyrics and chords, or snap a photo of a printed or handwritten sheet and our AI turns it into a clean, editable digital chord sheet.",
      },
      {
        q: "Will it scroll while I play?",
        a: "Yes. Hands-free auto-scroll keeps your hands on the fretboard. Adjust the speed on the fly and read comfortably from any device on your music stand.",
      },
    ],
    ctaHeading: "Start your guitar chord sheets free",
    ctaBody: "Create your first chord sheets free — no credit card. Upgrade for unlimited songs and PDF export whenever you're ready.",
  },
  {
    slug: "piano-chord-sheets",
    metaTitle: "Piano & Keyboard Chord Sheets — Create Them Online Free",
    metaDescription:
      "Make piano and keyboard chord sheets online. AI finds the chords, you place them above the lyrics, and play along with hands-free auto-scroll. Free to start.",
    eyebrow: "For pianists & keys",
    h1: "Piano chord sheets",
    h1Accent: "without the busywork",
    intro:
      "ChordSheetMaker makes it easy to create piano and keyboard chord sheets for any song. Let AI find the chords, position them precisely over the lyrics, and play along while the sheet scrolls itself.",
    sections: [
      {
        heading: "Lead sheets the easy way",
        body: "Type a song title and get a complete chord chart in seconds — chords sitting right above the words, sections clearly marked, ready for the keys.",
      },
      {
        heading: "Transpose to a comfortable key",
        body: "Move any song up or down with a single tap. Every chord transposes instantly so you can match the singer or simplify the fingering.",
      },
      {
        heading: "Hands-free auto-scroll",
        body: "Keep both hands on the keyboard. The sheet scrolls at the speed you choose, and the font scales up so you can read it from the music desk.",
      },
      {
        heading: "Print or export to PDF",
        body: "Export a clean, professional PDF for your folder or share a link with your band, choir or worship team.",
      },
    ],
    faqs: [
      {
        q: "Is it free to make piano chord sheets?",
        a: "Yes. Start free with 5 songs and no credit card. Upgrade to Pro any time for unlimited songs, PDF export and sharing.",
      },
      {
        q: "Can I create lead sheets, not just chords?",
        a: "Type a song title and get a complete chord chart in seconds, with chords sitting right above the lyrics and sections clearly marked — ready for the keys.",
      },
      {
        q: "Can I transpose to an easier key?",
        a: "Yes. Move any song up or down with a single tap and every chord transposes instantly, so you can match the singer or simplify the fingering.",
      },
      {
        q: "Can I print or export my chord sheet?",
        a: "You can export a clean, professional PDF for your folder, or share a link with your band, choir or worship team.",
      },
    ],
    ctaHeading: "Create your piano chord sheets free",
    ctaBody: "Start free with 5 songs — no credit card required. Go unlimited any time with a Pro plan.",
  },
  {
    slug: "create-chord-sheets-online",
    metaTitle: "Create Chord Sheets Online — Free AI Chord Sheet Tool",
    metaDescription:
      "Create chord sheets online with AI. Search any song, drag chords above the lyrics, style with backgrounds and play with auto-scroll. Free to start, no download.",
    eyebrow: "100% online",
    h1: "Create chord sheets online,",
    h1Accent: "right in your browser",
    intro:
      "No downloads, no installs. ChordSheetMaker lets you create chord sheets online from any device. Search a song, let AI do the heavy lifting, then fine-tune the chords, style and key exactly how you like.",
    sections: [
      {
        heading: "Works on any device",
        body: "Build on your laptop, perform from your phone. Your chord sheets sync to your account so they're always one tap away, wherever you are.",
      },
      {
        heading: "AI-assisted from the first click",
        body: "Type a song name and get a ready-to-play chord sheet in seconds. Import existing chords by pasting text or snapping a photo of a printed sheet.",
      },
      {
        heading: "Style, transpose and perform",
        body: "Add AI-generated backgrounds, pick fonts and colours, transpose to any key, and play hands-free with auto-scroll built for the stage.",
      },
      {
        heading: "Share and export",
        body: "Send a public link to your bandmates or export a clean PDF. Organize everything into setlists for your next gig.",
      },
    ],
    faqs: [
      {
        q: "Do I need to download anything?",
        a: "No. ChordSheetMaker runs entirely in your browser — there's nothing to install. Create and perform from any laptop, phone or tablet.",
      },
      {
        q: "Is it free to use?",
        a: "Yes, you can start free with no credit card. Upgrade for unlimited songs, sharing and PDF export whenever you're ready.",
      },
      {
        q: "Can I import existing chords?",
        a: "Yes. Paste lyrics and chords as text, or snap a photo of a printed sheet and our AI converts it into a clean, editable chord sheet.",
      },
      {
        q: "Will my chord sheets sync across devices?",
        a: "Your chord sheets are saved to your account and sync automatically, so they're always one tap away wherever you sign in.",
      },
    ],
    ctaHeading: "Create your first chord sheet online",
    ctaBody: "Start free — no credit card, no download. Upgrade for unlimited songs, sharing and PDF export when you're ready.",
  },
  {
    slug: "ukulele-chord-sheets",
    metaTitle: "Ukulele Chord Sheets — Create & Play Them Online Free",
    metaDescription:
      "Make ukulele chord sheets online in seconds. AI finds the chords, you drag them above the lyrics, then strum along with hands-free auto-scroll. Free to start.",
    eyebrow: "For ukulele players",
    h1: "Ukulele chord sheets,",
    h1Accent: "ready to strum",
    intro:
      "Turn any song into a clean ukulele chord sheet in seconds. ChordSheetMaker finds the chords, lets you place them precisely above the lyrics, and scrolls hands-free while you strum.",
    sections: [
      {
        heading: "Chords above every lyric",
        body: "Drop each chord exactly where the change lands so you always know what to play next. Perfectly spaced on your phone, tablet or laptop.",
      },
      {
        heading: "Transpose to a uke-friendly key",
        body: "Move any song up or down with one tap to land on easy ukulele shapes — or to match your singing range.",
      },
      {
        heading: "Strum hands-free",
        body: "Hit play and the sheet scrolls at your pace like a teleprompter, so both hands stay on the strings.",
      },
      {
        heading: "Import what you already have",
        body: "Paste existing chords or snap a photo of a printed sheet and our AI turns it into a clean, editable ukulele chord sheet.",
      },
    ],
    faqs: [
      {
        q: "Is it free to make ukulele chord sheets?",
        a: "Yes — start free with no credit card. Build your first ukulele chord sheets and upgrade for unlimited songs and PDF export whenever you're ready.",
      },
      {
        q: "Can I transpose to easy ukulele keys?",
        a: "Yes. Transpose any song up or down with a single tap and every chord moves with it, so you can land on simple open shapes.",
      },
      {
        q: "Does it work on my phone or tablet?",
        a: "Absolutely. ChordSheetMaker runs in any browser, so you can build on a laptop and strum from your phone or tablet — your songs sync automatically.",
      },
      {
        q: "Will it scroll while I play?",
        a: "Yes. Hands-free auto-scroll keeps both hands on the strings. Adjust the speed on the fly and read from any device on your music stand.",
      },
    ],
    ctaHeading: "Start your ukulele chord sheets free",
    ctaBody: "Create your first chord sheets free — no credit card. Upgrade for unlimited songs and PDF export whenever you're ready.",
  },
  {
    slug: "worship-chord-sheets",
    metaTitle: "Worship Chord Sheets — Make Charts for Your Team Online",
    metaDescription:
      "Create worship chord sheets and lead sheets online. AI finds the chords, transpose to any key for your vocalist, and share with your whole team. Free to start.",
    eyebrow: "For worship teams",
    h1: "Worship chord sheets,",
    h1Accent: "ready for Sunday",
    intro:
      "Build clean worship chord charts your whole team can read. ChordSheetMaker finds the chords for any song, transposes to the right key in a tap, and lets you share a link or export PDFs for the band.",
    sections: [
      {
        heading: "Charts your whole team can read",
        body: "Chords sit right above the lyrics with sections clearly labelled, so guitar, keys and vocals are all on the same page.",
      },
      {
        heading: "Transpose for any vocalist",
        body: "Move a song into the singer's key with a single tap. Every chord transposes instantly — perfect for rotating worship leaders.",
      },
      {
        heading: "Share with the band",
        body: "Send a public link to your team or export clean PDFs for the folder. Organize songs into setlists for each service.",
      },
      {
        heading: "Lead the set hands-free",
        body: "Auto-scroll keeps your hands on the instrument while the sheet moves at your pace, with large, readable text from the stage.",
      },
    ],
    faqs: [
      {
        q: "Is it free for worship teams?",
        a: "Yes — start free with no credit card. Upgrade to Pro any time for unlimited songs, sharing and PDF export for the whole team.",
      },
      {
        q: "Can I transpose into the singer's key?",
        a: "Yes. Transpose any song up or down with one tap and every chord moves with it — ideal when worship leaders sing in different keys.",
      },
      {
        q: "Can I share charts with my band?",
        a: "You can send a public link to anyone on your team or export clean PDFs, and group songs into setlists for each service.",
      },
      {
        q: "Can I build setlists for a service?",
        a: "Yes. Organize your chord sheets into setlists so your whole team has the right songs in the right order, ready to play.",
      },
    ],
    ctaHeading: "Create your worship chord sheets free",
    ctaBody: "Start free — no credit card. Upgrade for unlimited songs, sharing and PDF export for your whole team.",
  },
  {
    slug: "chord-chart-maker",
    metaTitle: "Chord Chart Maker — Build Chord Charts Online Free",
    metaDescription:
      "A free online chord chart maker. Search any song with AI, drag chords above the lyrics, transpose to any key and perform with auto-scroll. No download, start free.",
    eyebrow: "Free chord chart maker",
    h1: "The chord chart maker",
    h1Accent: "musicians actually enjoy",
    intro:
      "ChordSheetMaker is a free online chord chart maker that turns any song into a clean, playable chart in seconds. Type a title, let AI find the chords, then drag each one exactly where it falls above the lyrics.",
    sections: [
      {
        heading: "Build a chord chart in seconds",
        body: "Search any song by name and our AI builds a complete chord chart — chords aligned over the right syllables, sections labelled, ready to play.",
      },
      {
        heading: "Drag-and-drop placement",
        body: "Grab a chord and drop it above the exact beat where it changes. What you see is what you play, perfectly spaced on every screen.",
      },
      {
        heading: "Transpose and perform",
        body: "Change the key with one tap, then play hands-free as the chart scrolls at your pace like a teleprompter.",
      },
      {
        heading: "Export and share",
        body: "Export a clean PDF for your binder or send a public link to your bandmates, and organize everything into setlists.",
      },
    ],
    faqs: [
      {
        q: "Is the chord chart maker free?",
        a: "Yes. Create your first chord charts free with no credit card. Upgrade to Pro any time for unlimited songs, PDF export and sharing.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. It runs entirely in your browser — build on a laptop and perform from your phone or tablet, with your charts synced automatically.",
      },
      {
        q: "Can the AI build a chart from a song title?",
        a: "Yes. Type a song name and our AI creates a complete chord chart in seconds, which you can fine-tune with a single click.",
      },
      {
        q: "Can I transpose a chord chart?",
        a: "Yes. Transpose up or down with one tap and every chord moves with it, so you can match any singer or instrument.",
      },
    ],
    ctaHeading: "Build your first chord chart free",
    ctaBody: "Start free — no credit card, no download. Upgrade for unlimited songs, sharing and PDF export when you're ready.",
  },
];

export const LANDING_SLUGS = LANDING_PAGES.map((p) => p.slug);

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
