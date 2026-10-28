import { describe, expect, it } from "vitest";
import { cleanForm, withError } from "./forms";

function form(entries: [string, string | Blob][]): FormData {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

describe("cleanForm", () => {
  it("trims values and omits blank fields", () => {
    const out = cleanForm(form([["name", "  Acme "], ["notes", "   "], ["title", ""]]));
    expect(out).toEqual({ name: "Acme" });
  });

  it("collects multi keys into arrays and drops blanks", () => {
    const out = cleanForm(
      form([["affinity", "ALUMNI"], ["affinity", ""], ["affinity", "MAJOR"]]),
      ["affinity"],
    );
    expect(out).toEqual({ affinity: ["ALUMNI", "MAJOR"] });
  });

  it("returns an empty array for a multi key with nothing selected", () => {
    const out = cleanForm(form([["affinity", ""]]), ["affinity"]);
    expect(out).toEqual({ affinity: [] });
  });

  it("ignores Next internal fields and file uploads", () => {
    const out = cleanForm(
      form([
        ["$ACTION_ID_abc", "x"],
        ["upload", new Blob(["data"])],
        ["name", "Acme"],
      ]),
    );
    expect(out).toEqual({ name: "Acme" });
  });
});

describe("withError", () => {
  it("encodes the message", () => {
    expect(withError("/companies", "Name & tier are required")).toBe(
      "/companies?error=Name%20%26%20tier%20are%20required",
    );
  });
});
