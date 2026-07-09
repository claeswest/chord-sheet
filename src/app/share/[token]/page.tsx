import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import ShareViewer from "./ShareViewer";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const [share, session] = await Promise.all([
    prisma.share.findUnique({ where: { id: token } }),
    auth(),
  ]);

  if (!share) notFound();

  const content = share.content as any;

  return (
    <ShareViewer
      title={share.title}
      artist={share.artist}
      lines={content.lines ?? []}
      style={content.style ?? undefined}
      token={token}
      // Growth loop: recipients without an account get a "create your own" CTA
      promo={!session?.user}
    />
  );
}
