/**
 * Turn FormData into a plain object ready for Zod:
 * - blank or whitespace-only fields are omitted, so optional fields stay undefined
 * - keys listed in `multi` become arrays (checkboxes, multi-selects)
 * - file uploads and Next's internal `$ACTION_` fields are ignored
 */
export function cleanForm(
  formData: FormData,
  multi: readonly string[] = [],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION_")) continue;

    if (multi.includes(key)) {
      out[key] = formData
        .getAll(key)
        .filter((v): v is string => typeof v === "string" && v !== "");
      continue;
    }

    const value = formData.get(key);
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed !== "") out[key] = trimmed;
  }

  return out;
}

/** Build a redirect URL that carries a short error message for the page to show. */
export function withError(path: string, message: string): string {
  return `${path}?error=${encodeURIComponent(message)}`;
}
