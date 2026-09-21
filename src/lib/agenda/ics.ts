function formatIcsDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545: lines longer than 75 octets must be folded with a leading space.
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

export function buildActivityIcs(activity: {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
}): string {
  const dtStart = formatIcsDate(new Date(activity.starts_at).toISOString());
  const dtEnd = formatIcsDate(
    new Date(activity.ends_at ?? new Date(activity.starts_at).getTime() + 60 * 60 * 1000).toISOString()
  );
  const dtStamp = formatIcsDate(new Date().toISOString());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VOC Ledenportaal//NL",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${activity.id}@voc-ledenportaal`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(activity.title)}`,
  ];

  if (activity.location) lines.push(`LOCATION:${escapeIcsText(activity.location)}`);
  if (activity.description) lines.push(`DESCRIPTION:${escapeIcsText(activity.description)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
