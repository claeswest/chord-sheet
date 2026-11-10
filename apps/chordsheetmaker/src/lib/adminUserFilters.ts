// The tabs on the admin users list, shared by the page and its API route.
// Who belongs in each is decided in the route, as database conditions.

export const USER_FILTERS = ["all", "paying", "trial", "cancelling"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export const USER_FILTER_LABELS: Record<UserFilter, string> = {
  all: "All",
  paying: "Paying",
  trial: "On trial",
  cancelling: "Cancelling",
};

export function parseUserFilter(raw: string | null | undefined): UserFilter {
  return (USER_FILTERS as readonly string[]).includes(raw ?? "") ? (raw as UserFilter) : "all";
}
