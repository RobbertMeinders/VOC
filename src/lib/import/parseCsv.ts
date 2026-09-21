export type ImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyName: string;
};

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  firstName: ["voornaam", "first_name", "firstname", "voorletters"],
  lastName: ["achternaam", "last_name", "lastname"],
  email: ["email", "e-mail", "emailadres", "e-mailadres"],
  phone: ["telefoon", "telefoonnummer", "phone", "tel"],
  jobTitle: ["functie", "job_title", "functietitel", "titel"],
  companyName: ["bedrijf", "bedrijfsnaam", "company", "organisatie"],
};

function splitLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Parses a member-list CSV (comma or semicolon separated — semicolon is the
 * common export delimiter from Dutch Excel) with a header row into
 * ImportRow objects. Column order is flexible: header names are matched
 * case-insensitively against a small set of Dutch/English aliases, and any
 * unrecognized column is ignored.
 */
export function parseMemberCsv(text: string): ImportRow[] {
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = (lines[0].match(/;/g) ?? []).length >= (lines[0].match(/,/g) ?? []).length ? ";" : ",";
  const headers = splitLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());

  const columnIndex: Partial<Record<keyof ImportRow, number>> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof ImportRow, string[]][]) {
    const index = headers.findIndex((h) => aliases.includes(h));
    if (index !== -1) columnIndex[field] = index;
  }

  return lines.slice(1).map((line) => {
    const cells = splitLine(line, delimiter);
    const get = (field: keyof ImportRow) => {
      const index = columnIndex[field];
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };
    return {
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email").toLowerCase(),
      phone: get("phone"),
      jobTitle: get("jobTitle"),
      companyName: get("companyName"),
    };
  });
}
