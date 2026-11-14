// The example songs on the start page, as plain text.
//
// These are original songs written for this site — words and chords — so the
// examples show nobody else's lyrics. Keep it that way: do not paste a real
// song in here.
//
// Format: "# Name" starts a section, [C] puts a chord over the next syllable.
// No imports, on purpose — the script that asks the AI for each song's look
// reads this file directly.

export interface ExampleSource {
  slug: string;
  title: string;
  /** Shown where an artist would be. Says what it is rather than inventing a band. */
  artist: string;
  /** One line for the card on the start page. */
  vibe: string;
  /** Which of the style panel's background styles the picture was made with. */
  bgStyle: string;
  /**
   * Add one each time the card's screenshot is retaken: the file is then
   * <slug>-<rev>.jpg. Images are cached by address, so a new picture under
   * the old name keeps showing the old one.
   */
  rev?: number;
  /**
   * What was changed by hand after the AI's look, the way "Adjust" does in
   * the editor. Leave it out and the song is exactly what the AI returned.
   */
  adjust?: {
    /** Page colour, which is also what is laid over the picture. */
    background?: string;
    /** How much of the page colour covers the picture (default 0.5). */
    overlayOpacity?: number;
    colors?: Partial<Record<"title" | "artist" | "lyrics" | "chords" | "section", string>>;
  };
  text: string;
}

export const EXAMPLE_SOURCES: ExampleSource[] = [
  {
    slug: "midnight-signal",
    title: "Midnight Signal",
    artist: "Synth-pop · original",
    vibe: "Neon night, dark stage look",
    bgStyle: "neon",
    text: `
# Intro
[Am]        [F]        [C]        [G]

# Verse 1
[Am]City hums a [F]low electric tune
[C]Windows flicker [G]like a paper moon
[Am]I've been walking [F]since the trains shut down
[C]Chasing echoes [G]through a sleeping town

# Pre-chorus
[F]Every corner [G]glows a little brighter
[F]Every heartbeat [G]pulls the wire tighter

# Chorus
[C]Send me a [G]midnight signal
[Am]Light up the [F]dark for me
[C]One spark a[G]cross the rooftops
[Am]And I'll know [F]where to be

# Verse 2
[Am]Rain is writing [F]lines across the glass
[C]Taxi colours [G]blur as they go past
[Am]Got your number [F]folded in my coat
[C]And a chorus [G]caught inside my throat

# Pre-chorus
[F]Every corner [G]glows a little brighter
[F]Every heartbeat [G]pulls the wire tighter

# Chorus
[C]Send me a [G]midnight signal
[Am]Light up the [F]dark for me
[C]One spark a[G]cross the rooftops
[Am]And I'll know [F]where to be

# Bridge
[Dm]If the power [Am]fails tonight
[Dm]If the skyline [G]loses all its light
[Dm]I will be the [Am]one who's still awake
[F]Counting every [G]second that you take

# Last chorus
[C]Send me a [G]midnight signal
[Am]Light up the [F]dark for me
[C]One spark a[G]cross the rooftops
[Am]And I'll come [F]running, wait and [C]see
`,
  },
  {
    slug: "salt-and-clover",
    title: "Salt and Clover",
    artist: "Folk · original",
    vibe: "Watercolour coast, light and airy",
    bgStyle: "watercolor",
    text: `
# Intro
[G]        [C]        [G]        [D]

# Verse 1
[G]Grandad kept a [C]boat he never [G]sailed
[G]Painted green and [Em]tied up to the [D]rail
[G]Said the sea would [C]wait another [G]year
[Em]There was hay to [D]bring in over [G]here

# Chorus
[C]Salt and [G]clover, [D]wind off the [G]bay
[C]Half of me is [G]leaving, [Em]half of me will [D]stay
[C]Carry me [G]over, [D]carry me [Em]home
[C]Salt and [G]clover [D]wherever I [G]roam

# Verse 2
[G]Mother hung the [C]washing in the [G]sun
[G]White sheets flying [Em]till the day was [D]done
[G]Told me, child, the [C]tide will call your [G]name
[Em]Go and see it, [D]come back just the [G]same

# Chorus
[C]Salt and [G]clover, [D]wind off the [G]bay
[C]Half of me is [G]leaving, [Em]half of me will [D]stay
[C]Carry me [G]over, [D]carry me [Em]home
[C]Salt and [G]clover [D]wherever I [G]roam

# Verse 3
[G]Now I keep a [C]window facing [G]west
[G]City gulls, a [Em]jar of sand at [D]best
[G]But when the evening [C]smells of rain and [G]hay
[Em]I can hear the [D]harbour far a[G]way

# Chorus
[C]Salt and [G]clover, [D]wind off the [G]bay
[C]Half of me is [G]leaving, [Em]half of me will [D]stay
[C]Carry me [G]over, [D]carry me [Em]home
[C]Salt and [G]clover [D]wherever I [G]roam
`,
  },
  {
    slug: "half-past-blue",
    title: "Half Past Blue",
    artist: "Jazz ballad · original",
    vibe: "Late-night jazz club, lead-sheet chords",
    bgStyle: "jazz",
    rev: 2,
    // The AI set this one in black ink on cream paper, which over a dark
    // picture went grey. The fonts, the jazz chords and the picture are its
    // own; the colours were turned to night by hand.
    adjust: {
      background: "#0b1424",
      overlayOpacity: 0.4,
      colors: { title: "#f6e7c4", artist: "#9fb4cf", lyrics: "#ece6d8", chords: "#f3b562", section: "#7f9cc4" },
    },
    text: `
# Intro
[Fmaj7]          [Dm7]          [Gm7]          [C7]

# Verse 1
[Fmaj7]The band packed [Dm7]up an hour a[Gm7]go [C7]
[Fmaj7]The barman's [D7]counting what we [Gm7]owe [C7]
[Am7]One last [D7]candle, [Gm7]one last [C7]tune
[Fmaj7]It's half past [Gm7]blue and I'm [C7]thinking of [Fmaj7]you

# Verse 2
[Fmaj7]Your glass still [Dm7]sits where it was [Gm7]left [C7]
[Fmaj7]A lipstick [D7]moon around the [Gm7]edge [C7]
[Am7]Rain keeps [D7]time on the [Gm7]avenue [C7]
[Fmaj7]It's half past [Gm7]blue and I'm [C7]thinking of [Fmaj7]you

# Bridge
[Bbmaj7]Mornings are for [Bbm6]people who are [Fmaj7]sure [F7]
[Bbmaj7]Evenings are for [Bbm6]those who ask for [Am7]more [D7]
[Gm7]Somewhere in be[C7]tween the two
[Am7b5]There's an [D7]hour made for [Gm7]me and [C7]you

# Verse 3
[Fmaj7]So play it [Dm7]slow and play it [Gm7]low [C7]
[Fmaj7]There's nowhere [D7]else I need to [Gm7]go [C7]
[Am7]Let the [D7]city [Gm7]do what cities [C7]do
[Fmaj7]It's half past [Gm7]blue and I'm [C7]staying with [Fmaj7]you

# Outro
[Gm7]Half past [C7]blue          [Fmaj7]
`,
  },
];

export const EXAMPLE_SLUGS = EXAMPLE_SOURCES.map((s) => s.slug);
