import "server-only";

import ExcelJS from "exceljs";
import { csvEscape, xlsxSafeText } from "@/lib/export/csv";
import type { Database } from "@/lib/types/database";

type ExportRow = Database["public"]["Functions"]["get_members_export"]["Returns"][number];

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  lid: "Lid",
  opgezegd: "Opgezegd",
  "oud-lid": "Oud-lid",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// Eén contactpersoon-tekstregel voor de samengevatte kolom op de .xlsx
// ("Jan Jansen (Directeur), jan@bedrijf.nl, 06-12345678, primair"): elke
// contactpersoon op zijn eigen regel binnen de cel (newline, geen
// puntkomma's tussen contactpersonen — die kunnen in een naam of functie
// voorkomen en zouden de regels dan onleesbaar door elkaar laten lopen).
function formatContactLine(row: ExportRow): string {
  const name = [row.contact_first_name, row.contact_last_name].filter(Boolean).join(" ") || "(naam onbekend)";
  const parts = [name];
  if (row.contact_job_title) parts.push(`(${row.contact_job_title})`);
  const contactInfo = [row.contact_email, row.contact_phone].filter(Boolean).join(", ");
  if (contactInfo) parts.push(contactInfo);
  if (row.contact_is_primary) parts.push("primair");
  return parts.join(", ");
}

type CompanyGroup = {
  row: ExportRow;
  contacts: ExportRow[];
};

function groupByCompany(rows: ExportRow[]): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();
  for (const row of rows) {
    const existing = groups.get(row.company_id);
    if (existing) {
      if (row.contact_profile_id) existing.contacts.push(row);
    } else {
      groups.set(row.company_id, { row, contacts: row.contact_profile_id ? [row] : [] });
    }
  }
  return [...groups.values()];
}

const XLSX_HEADERS = [
  "Bedrijfsnaam",
  "Status",
  "Lid sinds",
  "Einddatum",
  "Adres",
  "Postcode",
  "Plaats",
  "Bedrijf e-mail",
  "Bedrijf telefoon",
  "Bedrijf website",
  "Contactpersonen",
];

export async function buildMembersXlsx(rows: ExportRow[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leden");
  sheet.addRow(XLSX_HEADERS);
  sheet.getRow(1).font = { bold: true };

  for (const group of groupByCompany(rows)) {
    const r = group.row;
    const contactsText = group.contacts.length > 0 ? group.contacts.map(formatContactLine).join("\n") : "(geen contactpersoon gekoppeld)";
    sheet.addRow(
      [
        r.company_name,
        statusLabel(r.membership_status),
        r.member_since ?? "",
        r.membership_end_date ?? "",
        r.company_address ?? "",
        r.company_postal_code ?? "",
        r.company_city ?? "",
        r.company_email ?? "",
        r.company_phone ?? "",
        r.company_website ?? "",
        contactsText,
      ].map((value) => (typeof value === "string" ? xlsxSafeText(value) : value))
    );
  }

  for (let i = 2; i <= sheet.rowCount; i++) {
    sheet.getCell(`K${i}`).alignment = { wrapText: true, vertical: "top" };
  }
  sheet.columns.forEach((column) => {
    column.width = 22;
  });
  sheet.getColumn(11).width = 48;

  return workbook.xlsx.writeBuffer();
}

const CSV_HEADERS = [
  "Bedrijf ID",
  "Bedrijfsnaam",
  "Status",
  "Lid sinds",
  "Einddatum",
  "Adres",
  "Postcode",
  "Plaats",
  "Bedrijf e-mail",
  "Bedrijf telefoon",
  "Bedrijf website",
  "Contactpersoon ID",
  "Voornaam",
  "Achternaam",
  "E-mail",
  "Telefoon",
  "Functie",
  "Primair contact",
  "Heeft account",
];

// "Heeft account" staat hier altijd op "Ja": elke company_members-rij
// verwijst naar een profiles-rij, en profiles.id verwijst zelf weer 1:1
// naar auth.users.id (0001_init.sql) — een contactpersoon zonder account
// bestaat in het huidige datamodel niet als company_members-rij (alleen
// als losse, nog niet geaccepteerde uitnodiging in `invitations`, die hier
// bewust niet wordt meegenomen: dat is geen contactpersoon van het bedrijf,
// slechts een openstaande uitnodiging). Deze kolom blijft toch in de
// export staan, zoals gevraagd, zodat een toekomstig datamodel met
// account-loze contactpersonen 'm meteen kan vullen.
export function buildMembersCsv(rows: ExportRow[]): string {
  const lines = [CSV_HEADERS.map(csvEscape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.company_id,
        r.company_name,
        statusLabel(r.membership_status),
        r.member_since ?? "",
        r.membership_end_date ?? "",
        r.company_address ?? "",
        r.company_postal_code ?? "",
        r.company_city ?? "",
        r.company_email ?? "",
        r.company_phone ?? "",
        r.company_website ?? "",
        r.contact_profile_id ?? "",
        r.contact_first_name ?? "",
        r.contact_last_name ?? "",
        r.contact_email ?? "",
        r.contact_phone ?? "",
        r.contact_job_title ?? "",
        r.contact_is_primary ? "Ja" : "Nee",
        r.contact_profile_id ? "Ja" : "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}
