import SchedulerApp from "@/components/SchedulerApp";

// The start page: what this is, and where a timetable is uploaded. The schedule
// itself is at /schema. See SchedulerApp for why they are two addresses and
// one component.
export default function StartPage() {
  return <SchedulerApp view="start" />;
}
