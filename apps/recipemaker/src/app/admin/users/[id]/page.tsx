import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { getAdminUser, type AdminRecipeRow } from "@/lib/adminData";
import { ago, billingLabel, day, eventDetail, eventLabel, importSource, when } from "@/lib/adminFormat";

// One person: who they are, what they pay, their recipes, and what they have
// done. Read-only, like the rest of /admin — the recipes open for reading and
// nothing here can change them.

export const metadata = { title: "Admin · person" };

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

/** How a recipe got here, in a few words. Empty when it was typed in. */
function origin(r: AdminRecipeRow): string {
  if (!r.importedFrom) return "";
  if (r.importedFrom === "try") return "kept from the paste box";
  return `imported ${importSource(r.importedFrom)}`;
}

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();

  const { id } = await params;
  const user = await getAdminUser(id);
  if (!user) notFound();

  const imported = user.recipeList.filter((r) => r.importedFrom).length;

  return (
    <>
      <p className="mt-6 text-sm">
        <Link href="/admin/users" className="text-ink-muted hover:text-ink">
          ← All people
        </Link>
      </p>

      <header className="mt-4">
        <h2 className="font-display text-2xl font-bold">{user.name || user.email}</h2>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-ink-muted">
          <a href={`mailto:${user.email}`} className="hover:text-ink hover:underline">
            {user.email}
          </a>
          <span>{billingLabel(user)}</span>
          {user.marketingOptOut && <span className="text-ink-faint">opted out of emails</span>}
          {user.hasStripeCustomer ? (
            // A plain <a>, not <Link>: it is a redirect out of the site, and
            // must not be prefetched.
            <a
              href={`/api/admin/users/${user.id}/stripe`}
              target="_blank"
              rel="noopener"
              className="sm:ml-auto rounded-full border border-rule px-3 py-1 text-ink hover:bg-paper-sunken"
            >
              Open in Stripe ↗
            </a>
          ) : (
            <span className="text-ink-faint sm:ml-auto">Never been through checkout</span>
          )}
        </p>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-5 rounded-card border border-rule bg-paper-raised p-5 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Joined">{day(user.createdAt)}</Fact>
        <Fact label="Last active">
          {user.lastActive ? (
            <span title={when(user.lastActive)}>{ago(user.lastActive)}</span>
          ) : (
            "—"
          )}
        </Fact>
        <Fact label="Recipes">{user.recipes}</Fact>
        <Fact label="AI imports">{imported}</Fact>
        <Fact label="Collections">{user.collections}</Fact>
        <Fact label="Share links">{user.shares}</Fact>
      </dl>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section>
          <h3 className="font-display text-xl font-bold">
            Recipes <span className="text-ink-faint">{user.recipes}</span>
          </h3>

          {user.recipeList.length === 0 ? (
            // The most useful thing this page can tell you: someone arrived
            // and never wrote anything.
            <p className="mt-3 text-sm text-ink-faint">Signed up but never wrote a recipe.</p>
          ) : (
            <ul className="mt-3 divide-y divide-rule/60">
              {user.recipeList.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/users/${user.id}/recipes/${r.id}`}
                    className="group flex items-center gap-3 py-2.5"
                  >
                    {r.imageUrl ? (
                      // A data URL, so next/image has nothing to optimise.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg border border-rule object-cover"
                      />
                    ) : (
                      <span className="h-12 w-12 shrink-0 rounded-lg border border-rule bg-paper-sunken" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium group-hover:underline">
                        {r.title || "Untitled recipe"}
                      </span>
                      <span className="block text-xs text-ink-faint">
                        {[
                          `edited ${ago(r.updatedAt)}`,
                          `made ${day(r.createdAt)}`,
                          origin(r),
                          r.shared ? "shared" : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="font-display text-xl font-bold">Timeline</h3>

          {user.timeline.length === 0 ? (
            <p className="mt-3 text-sm text-ink-faint">Nothing recorded for this account yet.</p>
          ) : (
            <ol className="mt-3 divide-y divide-rule/60">
              {user.timeline.map((e) => {
                const detail = eventDetail(e.type, e.meta);
                return (
                  <li key={e.id} className="py-2 text-sm">
                    <p className="flex items-baseline gap-3">
                      <span className="font-medium">{eventLabel(e.type)}</span>
                      <span className="ml-auto shrink-0 text-xs text-ink-faint">
                        {when(e.createdAt)}
                      </span>
                    </p>
                    {detail && <p className="text-xs text-ink-muted">{detail}</p>}
                  </li>
                );
              })}
            </ol>
          )}

          {user.timelineTotal > user.timeline.length && (
            <p className="mt-3 text-xs text-ink-faint">
              The latest {user.timeline.length} of {user.timelineTotal} events.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
