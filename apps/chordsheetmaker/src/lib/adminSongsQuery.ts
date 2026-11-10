import { Prisma } from "@/generated/prisma";
import { adminRecipients } from "@/lib/notify";

/**
 * One row per song with everything the admin filters and counts on, worked out
 * in Postgres. The list and the stats both select from this, so a number on the
 * dashboard and the rows behind it are always the same set.
 *
 * It never returns `content` itself. Backgrounds are stored as base64 inside
 * it — on the dev database a song averaged 100 KB and the largest was 600 KB —
 * so loading songs to count their lines would pull megabytes per page.
 *
 *  - origin:   from the song_created activity row (meta.songId → meta.origin).
 *              Songs from before origin was logged come out "unknown".
 *  - hasBg:    a non-empty style.backgroundImage.
 *  - bgSource, aiStyled: recorded by the editor since 10 Nov 2026 only.
 *  - lines / chars / chords / sections: lyric lines, the characters of their
 *              text, the chords placed on them, and section headers.
 *  - bytes:    the stored size of content, compressed as Postgres keeps it.
 *
 * Scale: this expands every song's lines on each call. Fine at hundreds or a
 * few thousand songs; past that, store these as columns at save time.
 *
 * The admins' own songs (ADMIN_EMAILS) are left out unless includeAdmins —
 * the same rule as the activity feed, since test songs would swamp the numbers.
 */
export function songFacts(includeAdmins: boolean): Prisma.Sql {
  const admins = includeAdmins ? [] : adminRecipients().map((e) => e.toLowerCase());
  const adminFilter = admins.length
    ? Prisma.sql`where lower(u.email) <> all(${admins}::text[])`
    : Prisma.empty;

  return Prisma.sql`
    select
      s.id, s.title, s.artist, s.key, s."createdAt", s."updatedAt", s."userId",
      u.name as "userName", u.email as "userEmail",
      coalesce(o.origin, 'unknown') as origin,
      (coalesce(s.content->'style'->>'backgroundImage', '') <> '') as "hasBg",
      case when s.content->'style'->>'backgroundSource' in ('ai', 'upload')
           then s.content->'style'->>'backgroundSource' end as "bgSource",
      (s.content->'style'->'aiStyled' = 'true'::jsonb) is true as "aiStyled",
      m.lines, m.chars, m.chords, m.sections,
      s.content->'style'->'lyrics'->>'fontFamily' as font,
      pg_column_size(s.content)::int as bytes
    from "Song" s
    join "User" u on u.id = s."userId"
    left join lateral (
      select a.meta->>'origin' as origin
      from "ActivityLog" a
      where a.type = 'song_created' and a.meta->>'songId' = s.id
      order by a."createdAt"
      limit 1
    ) o on true
    cross join lateral (
      select
        count(*) filter (where e->>'type' = 'lyric')::int as lines,
        coalesce(sum(length(e->>'text')) filter (where e->>'type' = 'lyric'), 0)::int as chars,
        coalesce(sum(case when e->>'type' = 'lyric' and jsonb_typeof(e->'chords') = 'array'
                          then jsonb_array_length(e->'chords') else 0 end), 0)::int as chords,
        count(*) filter (where e->>'type' = 'section')::int as sections
      from jsonb_array_elements(
        case when jsonb_typeof(s.content->'lines') = 'array' then s.content->'lines' else '[]'::jsonb end
      ) e
    ) m
    ${adminFilter}
  `;
}
