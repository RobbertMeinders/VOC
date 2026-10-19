import { clsx } from "clsx";

type ActivityForStrip = { starts_at: string; source: "voc" | "lid" };

const WEEKDAY_LABELS = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = maandag
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Redesign fase 4: weekstrook bovenaan Agenda — puur een "wat speelt er deze
// week"-overzicht, geen filter/interactie (dat is bewust optioneel/later,
// zie docs/redesign-ontwerp.md). Stippen i.p.v. een volledige kalender:
// rood voor een VOC-activiteit die dag, petrol voor extern.
//
// Afwerkronde blok 6: "deze week" was meestal leeg en voegde dan weinig toe
// — toont nu de week van de eerstvolgende activiteit (meestal dus al wel
// iets te zien), met terugval op de huidige week als er niets gepland
// staat.
export function WeekStrip({ activities }: { activities: ActivityForStrip[] }) {
  const today = new Date();
  const nextUpcoming = activities
    .map((a) => new Date(a.starts_at))
    .filter((d) => d >= today)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const monday = startOfWeek(nextUpcoming ?? today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayActivities = activities.filter((a) => isSameDay(new Date(a.starts_at), date));
    return {
      date,
      isToday: isSameDay(date, today),
      hasVoc: dayActivities.some((a) => a.source === "voc"),
      hasExtern: dayActivities.some((a) => a.source === "lid"),
    };
  });

  const monthLabel = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "Europe/Amsterdam" }).format(monday);

  return (
    <div className="rounded-2xl bg-surface p-3 shadow-sm">
      <p className="mb-2 px-1 text-xs font-semibold text-foreground">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <div
            key={i}
            className={clsx("flex flex-col items-center gap-1 rounded-xl py-1.5 text-center", day.isToday && "bg-petrol")}
          >
            <span className={clsx("text-[10px] font-medium", day.isToday ? "text-white/80" : "text-muted")}>
              {WEEKDAY_LABELS[i]}
            </span>
            <span className={clsx("font-display text-base font-extrabold", day.isToday ? "text-white" : "text-foreground")}>
              {day.date.getDate()}
            </span>
            <span className="flex h-1.5 items-center gap-0.5">
              {day.hasVoc && <span className={clsx("h-1 w-1 rounded-full", day.isToday ? "bg-white" : "bg-voc-red")} />}
              {day.hasExtern && <span className={clsx("h-1 w-1 rounded-full", day.isToday ? "bg-white" : "bg-petrol")} />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
