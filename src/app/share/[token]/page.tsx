import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ShareViewer from "./ShareViewer";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const share = await prisma.share.findUnique({ where: { id: token } });

  if (!share) notFound();

  const content = share.content as any;

  return (
    <ShareViewer
      title={share.title}
      artist={share.artist}
      lines={content.lines ?? []}
      style={content.style ?? undefined}
    />
  );
}
