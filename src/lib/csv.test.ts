import { describe, expect, it } from "vitest";
import { cleanLinkedinUrl, parseConnections, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded commas and newlines", () => {
    expect(parseCsv('a,"b,c","d ""q"" e"\n"x\ny",z,\n')).toEqual([
      ["a", "b,c", 'd "q" e'],
      ["x\ny", "z", ""],
    ]);
  });

  it("handles CRLF and a BOM", () => {
    expect(parseCsv("﻿a,b\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("cleanLinkedinUrl", () => {
  it("normalizes linkedin.com URLs and drops everything else", () => {
    expect(cleanLinkedinUrl("https://www.linkedin.com/in/jane/?utm=1#x")).toBe(
      "https://www.linkedin.com/in/jane",
    );
    expect(cleanLinkedinUrl("https://evil.com/in/jane")).toBeUndefined();
    expect(cleanLinkedinUrl("https://notlinkedin.com/in/jane")).toBeUndefined();
    expect(cleanLinkedinUrl("javascript:alert(1)")).toBeUndefined();
    expect(cleanLinkedinUrl("")).toBeUndefined();
  });
});

const EXPORT = `Notes:
"When exporting your connection data, you may notice that some of the email addresses are missing."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Jane,Doe,https://www.linkedin.com/in/jane-doe,,"Acme, Inc.",Software Engineer,01 Oct 2026
Sam,,https://www.linkedin.com/in/sam,,,,02 Oct 2026
,,https://www.linkedin.com/in/ghost,,Nowhere,Ghost,03 Oct 2026

`;

describe("parseConnections", () => {
  it("skips the Notes preamble and maps columns", () => {
    const { rows, skipped, error } = parseConnections(EXPORT);
    expect(error).toBeUndefined();
    expect(skipped).toBe(1);
    expect(rows).toEqual([
      {
        fullName: "Jane Doe",
        title: "Software Engineer",
        company: "Acme, Inc.",
        linkedinUrl: "https://www.linkedin.com/in/jane-doe",
      },
      {
        fullName: "Sam",
        title: undefined,
        company: undefined,
        linkedinUrl: "https://www.linkedin.com/in/sam",
      },
    ]);
  });

  it("works without a preamble and with reordered columns", () => {
    const { rows } = parseConnections("Company,Last Name,First Name\nAcme,Doe,Jane\n");
    expect(rows).toEqual([
      { fullName: "Jane Doe", title: undefined, company: "Acme", linkedinUrl: undefined },
    ]);
  });

  it("reports a clear error for the wrong file", () => {
    expect(parseConnections("id,total\n1,2\n").error).toMatch(/Connections\.csv/);
  });
});
