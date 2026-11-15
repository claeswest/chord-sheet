import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShareViewer from "@/app/share/[token]/ShareViewer";
import { EXAMPLE_SLUGS, exampleBySlug } from "@/data/exampleSongs";

// The start page's example songs, opened in play mode. They live in the
// repository rather than in the shares table, so they are the same in every
// environment and can't be lost with a database row.

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return EXAMPLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const song = exampleBySlug(slug);
  if (!song) return {};
  return {
    title: `${song.title} — example chord sheet`,
    description: `An original song set as a chord sheet with ChordSheetMaker: ${song.vibe.toLowerCase()}. Press play and it scrolls for you.`,
    alternates: { canonical: `/examples/${song.slug}` },
  };
}

export default async function ExamplePage({ params }: Props) {
  const { slug } = await params;
  const song = exampleBySlug(slug);
  if (!song) notFound();

  return (
    <ShareViewer
      title={song.title}
      artist={song.artist}
      lines={song.lines}
      style={song.style}
      // Doubles as the id the viewer keeps scroll speed and text size under.
      token={`example-${song.slug}`}
      promo
      pdf={false}
    />
  );
}
