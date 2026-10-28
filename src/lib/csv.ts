// Pure CSV parsing for LinkedIn's Connections.csv export. No database or
// framework imports, so it is unit tested directly.

export type ConnectionRow = {
  fullName: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
};

export type ParsedConnections = {
  rows: ConnectionRow[];
  /** Data rows that were dropped (no name, or blank). */
  skipped: number;
  /** Set when the file does not look like a LinkedIn connections export. */
  error?: string;
};

/** RFC 4180-style parser: quoted fields, escaped quotes, commas/newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const MAX_FIELD = 120;
const clip = (s: string | undefined) => (s ?? "").trim().slice(0, MAX_FIELD);

/** Keep only linkedin.com URLs; anything else is dropped rather than failing the row. */
export function cleanLinkedinUrl(raw: string | undefined): string | undefined {
  const value = (raw ?? "").trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return undefined;
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

/**
 * LinkedIn's export starts with a few "Notes:" lines before the header row, and
 * the header is "First Name,Last Name,URL,Email Address,Company,Position,Connected On".
 * We find the header by name, so the preamble (or its absence) doesn't matter.
 */
export function parseConnections(text: string): ParsedConnections {
  const table = parseCsv(text);
  const headerIndex = table.findIndex((r) =>
    r.some((c) => c.trim().toLowerCase() === "first name"),
  );
  if (headerIndex === -1) {
    return {
      rows: [],
      skipped: 0,
      error: "This doesn't look like LinkedIn's Connections.csv (no “First Name” column).",
    };
  }

  const header = table[headerIndex].map((c) => c.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const first = col("first name");
  const last = col("last name");
  const url = col("url");
  const company = col("company");
  const position = col("position");

  const rows: ConnectionRow[] = [];
  let skipped = 0;

  for (const r of table.slice(headerIndex + 1)) {
    if (r.every((c) => c.trim() === "")) continue; // blank line, not a skipped record
    const fullName = clip([r[first], r[last]].filter((p) => p?.trim()).join(" "));
    if (!fullName) {
      skipped++;
      continue;
    }
    rows.push({
      fullName,
      title: clip(r[position]) || undefined,
      company: clip(r[company]) || undefined,
      linkedinUrl: cleanLinkedinUrl(r[url]),
    });
  }

  return { rows, skipped };
}
