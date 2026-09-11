import type { Schedule } from "@/types/schedule";

// The sheet on the front page.
//
// A real week, anonymised by the parent it belongs to: the school, the town
// and every teacher code are invented, the times are not. Real times are the
// point. Further down the page the same week appears as the school printed
// it — a photograph of the sheet, public/solglantan.webp — and a before and
// after only proves anything if it is the same week twice. An invented tidy
// week next to somebody's real untidy one would be comparing two different
// things and calling the difference design.
//
// It is also what a real F-6 week looks like, which an invented one never
// quite manages: a 25-minute Swedish lesson squeezed in on Tuesday, sport
// starting at 08:05, two groups side by side on Friday afternoon, two
// teachers sharing slöjd.

const lesson = (
  id: string,
  start: string,
  end: string,
  subject: string,
  teacher?: string,
  room?: string,
) => ({ id, start, end, subject, room, teacher });

export const SAMPLE_SCHEDULE: Schedule = {
  heading: "Elins schema",
  title: "3B",
  subtitle: "Solgläntanskolan F-6 · Höstterminen 2026",
  notes: [],
  weeks: [
    {
      id: "w1",
      label: "",
      days: [
        {
          id: "d1",
          name: "Måndag",
          lessons: [
            lesson("m1", "08:00", "09:20", "SO", "KRN"),
            lesson("m2", "09:45", "11:10", "MA", "MTP"),
            lesson("m3", "11:15", "11:45", "Rast"),
            lesson("m4", "11:45", "12:15", "Lunch"),
            lesson("m5", "12:20", "12:50", "SV", "KRN"),
            lesson("m6", "13:05", "13:40", "IDH", "VSL", "Sporthallen"),
          ],
        },
        {
          id: "d2",
          name: "Tisdag",
          lessons: [
            lesson("t1", "08:00", "09:20", "MA", "MTP"),
            lesson("t2", "09:45", "10:10", "SV", "KRN"),
            lesson("t3", "10:15", "11:10", "EN", "KRN"),
            lesson("t4", "11:15", "11:45", "Rast"),
            lesson("t5", "11:45", "12:15", "Lunch"),
            lesson("t6", "12:20", "13:30", "SV", "KRN"),
          ],
        },
        {
          id: "d3",
          name: "Onsdag",
          lessons: [
            lesson("o1", "08:00", "09:20", "SV", "KRN"),
            lesson("o2", "09:45", "11:10", "SL", "FRD,HNX"),
            lesson("o3", "11:15", "11:45", "Rast"),
            lesson("o4", "11:45", "12:15", "Lunch"),
            lesson("o5", "12:20", "13:45", "NO", "MTP"),
          ],
        },
        {
          id: "d4",
          name: "Torsdag",
          lessons: [
            lesson("to1", "08:05", "08:55", "IDH", "VSL", "Sporthallen"),
            lesson("to2", "09:15", "10:10", "MA", "MTP"),
            lesson("to3", "10:10", "11:10", "SV", "KRN"),
            lesson("to4", "11:15", "11:45", "Rast"),
            lesson("to5", "11:45", "12:15", "Lunch"),
            lesson("to6", "12:20", "13:05", "MU", "QRP"),
            lesson("to7", "13:15", "14:00", "SO", "KRN"),
          ],
        },
        {
          id: "d5",
          name: "Fredag",
          lessons: [
            lesson("f1", "08:00", "09:20", "SV", "KRN"),
            lesson("f2", "09:45", "10:15", "TK", "MTP"),
            lesson("f3", "10:15", "11:10", "MA", "MTP"),
            lesson("f4", "11:15", "11:45", "Rast"),
            lesson("f5", "11:45", "12:15", "Lunch"),
            // Half the class in each, at the same time — the sheet prints them
            // side by side, and so does this one.
            lesson("f6", "12:20", "13:30", "BL", "MTP"),
            lesson("f7", "12:20", "13:30", "SV", "KRN"),
          ],
        },
      ],
    },
  ],
};

/**
 * The names a parent would type in once. Without them the sample would show
 * "KRN" in every box, and the first fault the page lists is exactly that.
 */
export const SAMPLE_TEACHERS: Record<string, string> = {
  KRN: "Karin",
  MTP: "Mattias",
  VSL: "Viktor",
  FRD: "Frida",
  HNX: "Hanna",
  QRP: "Rasmus",
};
