// The tabs on the admin users list, shared by the page and its API route.
// Who belongs in each is decided in the route, as database conditions.
//
// The first four are about money and are disjoint. The last three are about
// behaviour and overlap with them: someone active this week can also be on a
// trial.

export const USER_FILTERS = ["all", "paying", "trial", "cancelling", "active", "limit", "nosongs"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export const USER_FILTER_LABELS: Record<UserFilter, string> = {
  all: "All",
  paying: "Paying",
  trial: "On trial",
  cancelling: "Cancelling",
  active: "Active this week",
  limit: "At the song limit",
  nosongs: "No songs yet",
};

export function parseUserFilter(raw: string | null | undefined): UserFilter {
  return (USER_FILTERS as readonly string[]).includes(raw ?? "") ? (raw as UserFilter) : "all";
}

/** Columns the list can be sorted by. Without one, each tab has its own natural order. */
export const USER_SORTS = ["joined", "active", "songs"] as const;
export type UserSort = (typeof USER_SORTS)[number];

export function parseUserSort(raw: string | null | undefined): UserSort | null {
  return (USER_SORTS as readonly string[]).includes(raw ?? "") ? (raw as UserSort) : null;
}
