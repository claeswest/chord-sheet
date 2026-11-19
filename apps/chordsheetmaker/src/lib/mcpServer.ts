import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { prisma } from "@/lib/prisma";
import { siteNumbers } from "@/lib/siteNumbers";
import { adminInsights } from "@/lib/adminInsights";
import { planFromUser, getSongLimit } from "@/lib/plans";
import { parseChordSheet } from "@/lib/parseChordSheet";
import { linesToChordText } from "@/lib/chordText";
import { DEFAULT_STYLE } from "@/lib/songStyle";
import { logActivity } from "@/lib/activity";
import type { SongLine } from "@/types/song";

// The owner's own door into the app for an AI client (Claude Code, say): the
// site's numbers, and the songs in the owner's library. Who may come through
// is decided before this is ever built, in app/api/mcp/route.ts.
//
// Two rules hold for every tool here:
//
//   1. Numbers, never people. Nothing returns a customer's name or address.
//      What the tools say is read by an AI and kept in its conversation, and
//      that is no place for other people's details.
//   2. Songs are the owner's only: the account of the first address in
//      ADMIN_EMAILS. Nobody else's song can be listed, read or written.
//
// There is no tool that deletes or overwrites. Adding one is a decision, not
// an oversight to be fixed in passing.

/** Something a tool can say out loud: a full library, a song that is not there. */
class Problem extends Error {}

/** The account the tools act as: the first address in ADMIN_EMAILS. */
async function owner() {
  const email = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();
  if (!email) throw new Problem("ADMIN_EMAILS is not set, so there is no account to act as.");
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, plan: true, stripeSubscriptionId: true, stripeCurrentPeriodEnd: true, stripeSubscriptionStatus: true },
  });
  if (!user) throw new Problem("The first address in ADMIN_EMAILS has no account here yet. Sign in to the site with it once.");
  return user;
}

const asText = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

/**
 * A tool's failure, in words the client can show. Only our own problems are
 * passed on as they are. Anything else (a database error, say) can carry
 * details that belong in the server log and nowhere else.
 */
function failed(e: unknown) {
  if (!(e instanceof Problem)) console.error("[mcp] tool failed", e);
  return {
    content: [{ type: "text" as const, text: e instanceof Problem ? e.message : "Something went wrong on the server." }],
    isError: true,
  };
}

/**
 * @param siteUrl where the app is served from, for links in what the tools say.
 */
export function createMcpServer(siteUrl: string): McpServer {
  const server = new McpServer({ name: "chordsheetmaker", version: "1.0.0" });

  server.registerTool(
    "site_numbers",
    {
      title: "Site numbers",
      description:
        "How ChordSheetMaker is doing: accounts, songs, subscriptions and recurring revenue, the sign-up funnel, " +
        "visitors without an account, AI use and its estimated cost, the daily email job, and weekly trends. " +
        "Counts only: no names or addresses.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      try {
        const numbers = await siteNumbers();
        // The people who need attention are named in /admin. Here, how many.
        const { attention, ...insights } = await adminInsights();
        return asText({
          ...numbers,
          needingAttention: {
            trialsEndingWithinThreeDays: attention.trialsEnding.length,
            paymentProblems: attention.paymentProblems.length,
            cancelling: attention.cancelling.length,
            freeAccountsAtSongLimit: attention.atLimit.length,
          },
          ...insights,
        });
      } catch (e) {
        return failed(e);
      }
    },
  );

  server.registerTool(
    "list_songs",
    {
      title: "List my songs",
      description: "The songs in the owner's library, most recently changed first: id, title, artist and when it last changed.",
      inputSchema: z.object({
        search: z.string().max(100).optional().describe("Only songs whose title or artist contains this."),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ search }) => {
      try {
        const me = await owner();
        const songs = await prisma.song.findMany({
          where: {
            userId: me.id,
            ...(search?.trim()
              ? { OR: [
                  { title: { contains: search.trim(), mode: "insensitive" as const } },
                  { artist: { contains: search.trim(), mode: "insensitive" as const } },
                ] }
              : {}),
          },
          orderBy: { updatedAt: "desc" },
          select: { id: true, title: true, artist: true, updatedAt: true },
        });
        return asText({ count: songs.length, songs });
      } catch (e) {
        return failed(e);
      }
    },
  );

  server.registerTool(
    "get_song",
    {
      title: "Read a song",
      description:
        "One song from the owner's library as text, with each chord in square brackets where it falls in the words " +
        "([Am]Hello [G]world) and section names on lines of their own ([Chorus]).",
      inputSchema: z.object({ id: z.string().min(1).max(100).describe("The song's id, from list_songs.") }),
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      try {
        const me = await owner();
        const song = await prisma.song.findFirst({
          where: { id, userId: me.id },
          select: { id: true, title: true, artist: true, content: true, updatedAt: true },
        });
        if (!song) return failed(new Problem("There is no song with that id in the library."));
        const lines = ((song.content as { lines?: SongLine[] } | null)?.lines ?? []) as SongLine[];
        return asText({
          id: song.id,
          title: song.title,
          artist: song.artist,
          updatedAt: song.updatedAt,
          text: linesToChordText(lines),
        });
      } catch (e) {
        return failed(e);
      }
    },
  );

  server.registerTool(
    "create_song",
    {
      title: "Add a song",
      description:
        "Adds a new song to the owner's library. It never changes or replaces a song that is already there. " +
        "Write the words with each chord in square brackets where it falls ([Am]Hello [G]world), one line of the " +
        "song per line, and section names on lines of their own ([Verse 1], [Chorus]).",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(200),
        artist: z.string().trim().max(200).optional(),
        text: z.string().min(1).max(30_000).describe("The song: words with chords in square brackets, sections on their own lines."),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ title, artist, text }) => {
      try {
        const me = await owner();
        // The same limit as saving in the editor: the plan decides (plans.ts).
        const limit = getSongLimit(planFromUser(me));
        if (limit !== null && (await prisma.song.count({ where: { userId: me.id } })) >= limit) {
          return failed(new Problem(`The library is full: this plan holds ${limit} songs.`));
        }
        const lines = parseChordSheet(text);
        const song = await prisma.song.create({
          data: {
            id: crypto.randomUUID(),
            userId: me.id,
            title,
            artist: artist ?? "",
            // A new song's look, as the editor would give it.
            content: { lines, tags: [], style: DEFAULT_STYLE, semitones: 0 } as never,
          },
          select: { id: true, title: true },
        });
        await logActivity("song_created", me.id, { songId: song.id, title: song.title, origin: "mcp" });
        return asText({
          id: song.id,
          title: song.title,
          lines: lines.filter((l) => l.type === "lyric").length,
          sections: lines.filter((l) => l.type === "section").length,
          library: `${siteUrl}/songs`,
        });
      } catch (e) {
        return failed(e);
      }
    },
  );

  return server;
}
