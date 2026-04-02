import { auth } from "@/lib/auth";
import SongLibraryPage from "@/components/library/SongLibraryPage";

export default async function SongsPage() {
  const session = await auth();
  return (
    <SongLibraryPage
      isLoggedIn={!!session?.user?.id}
      userName={session?.user?.name ?? null}
      userImage={session?.user?.image ?? null}
    />
  );
}
