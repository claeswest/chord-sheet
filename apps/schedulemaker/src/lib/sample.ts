import type { Schedule } from "@/types/schedule";

// The sheet on the front page.
//
// Invented, down to the school and the teachers. The only real timetables this
// app has ever seen belong to somebody's children, and putting one on a public
// page is precisely the thing the rest of this product goes out of its way not
// to do — it is not stored on a server, not written to disk, not logged. A
// sample would be a strange place to break that.
//
// Written to look like a real lower-secondary week rather than a tidy one:
// lessons that don't start on the hour, a 30-minute class council, a lunch that
// moves by ten minutes on Thursday. A demo where everything lines up neatly
// would be showing off a schedule nobody has.

const lesson = (
  id: string,
  start: string,
  end: string,
  subject: string,
  room?: string,
  teacher?: string,
) => ({ id, start, end, subject, room, teacher });

export const SAMPLE_SCHEDULE: Schedule = {
  heading: "Elins schema",
  title: "3B",
  subtitle: "Solskolan · Höstterminen 2026",
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
            lesson("m1", "08:10", "09:00", "Sv", "12", "AnLi"),
            lesson("m2", "09:10", "10:00", "Ma", "12", "AnLi"),
            lesson("m3", "10:15", "11:00", "Idh", "Idrottshallen", "PeNo"),
            lesson("m4", "11:00", "11:40", "Lunch"),
            lesson("m5", "11:40", "12:30", "NO", "12", "AnLi"),
            lesson("m6", "12:40", "13:30", "Bd", "Bildsalen", "MaSj"),
          ],
        },
        {
          id: "d2",
          name: "Tisdag",
          lessons: [
            lesson("t1", "08:10", "09:20", "Ma", "12", "AnLi"),
            lesson("t2", "09:30", "10:20", "Sv", "12", "AnLi"),
            lesson("t3", "10:30", "11:00", "Mu", "Musiksalen", "KaBe"),
            lesson("t4", "11:00", "11:40", "Lunch"),
            lesson("t5", "11:40", "13:00", "Sl", "Slöjdsalen", "ToWi"),
          ],
        },
        {
          id: "d3",
          name: "Onsdag",
          lessons: [
            lesson("o1", "08:10", "09:40", "Sv", "12", "AnLi"),
            lesson("o2", "09:50", "10:40", "En", "12", "AnLi"),
            lesson("o3", "11:00", "11:40", "Lunch"),
            lesson("o4", "11:40", "12:30", "SO", "12", "AnLi"),
            lesson("o5", "12:40", "13:30", "Ma", "12", "AnLi"),
          ],
        },
        {
          id: "d4",
          name: "Torsdag",
          lessons: [
            lesson("to1", "08:10", "09:00", "NO", "12", "AnLi"),
            lesson("to2", "09:10", "10:30", "Bd", "Bildsalen", "MaSj"),
            lesson("to3", "10:40", "11:20", "Sv", "12", "AnLi"),
            lesson("to4", "11:20", "12:00", "Lunch"),
            lesson("to5", "12:00", "13:20", "Idh", "Idrottshallen", "PeNo"),
          ],
        },
        {
          id: "d5",
          name: "Fredag",
          lessons: [
            lesson("f1", "08:10", "09:30", "Ma", "12", "AnLi"),
            lesson("f2", "09:40", "10:30", "En", "12", "AnLi"),
            lesson("f3", "10:40", "11:10", "Klassråd", "12", "AnLi"),
            lesson("f4", "11:10", "11:50", "Lunch"),
            lesson("f5", "11:50", "13:00", "Sv", "12", "AnLi"),
          ],
        },
      ],
    },
  ],
};
