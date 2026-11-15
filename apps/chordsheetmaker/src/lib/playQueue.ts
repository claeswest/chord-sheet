// The list a song was opened from, kept so play mode can step to the next
// song in it. Before this a setlist could be built but not played: at the end
// of each song you went back to the library and found the next one.
//
// The library writes the list it is showing — a setlist, or all songs, in the
// order on screen — and play mode reads it. It lives in sessionStorage: it
// belongs to this tab and this sitting, and needs nothing from the server, so
// it works the same for a visitor without an account.

const KEY = "csm_play_queue";

export interface PlayQueueItem {
  id: string;
  title: string;
  /** The play-mode address of the song. */
  url: string;
}

export interface PlayQueue {
  /** The setlist's name, or "All songs". */
  label: string;
  items: PlayQueueItem[];
}

export function savePlayQueue(queue: PlayQueue): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* private mode, or a list too long to keep: play mode simply has no next song */
  }
}

/** Where a song sits in the list it was opened from. */
export interface QueuePosition {
  label: string;
  index: number;
  total: number;
  prev?: PlayQueueItem;
  next?: PlayQueueItem;
  first: PlayQueueItem;
}

export function queuePosition(songId: string | undefined): QueuePosition | null {
  if (!songId) return null;
  try {
    const queue = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as PlayQueue | null;
    if (!queue || !Array.isArray(queue.items) || queue.items.length < 2) return null;
    const index = queue.items.findIndex((it) => it.id === songId);
    // Opened from somewhere else — a link, the editor — so the list is not this song's.
    if (index < 0) return null;
    return {
      label: queue.label,
      index,
      total: queue.items.length,
      prev: queue.items[index - 1],
      next: queue.items[index + 1],
      first: queue.items[0],
    };
  } catch {
    return null;
  }
}
