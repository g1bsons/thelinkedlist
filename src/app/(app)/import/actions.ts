"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { parseConnections } from "@/lib/csv";
import { withError } from "@/lib/forms";

const PATH = "/import";
const MAX_BYTES = 1_000_000; // matches Next's default Server Action body limit
const MAX_ROWS = 10_000;

export async function importConnections(formData: FormData) {
  const userId = await requireUserId();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withError(PATH, "Choose your Connections.csv file first."));
  }
  if (file.size > MAX_BYTES) {
    redirect(withError(PATH, "That file is over 1 MB. Is it really Connections.csv?"));
  }

  const { rows, skipped, error } = parseConnections(await file.text());
  if (error) redirect(withError(PATH, error));
  if (rows.length === 0) redirect(withError(PATH, "No connections found in that file."));
  if (rows.length > MAX_ROWS) {
    redirect(withError(PATH, `Too many rows (max ${MAX_ROWS.toLocaleString()}).`));
  }

  const { created, duplicates } = await db.$transaction(async (tx) => {
    // Companies: match existing ones case-insensitively, create the rest as tier C
    // so a big import doesn't crowd out the employers you ranked on purpose.
    const existingCompanies = await tx.company.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const companyIds = new Map(existingCompanies.map((c) => [c.name.toLowerCase(), c.id]));

    const newNames = new Map<string, string>();
    for (const r of rows) {
      if (r.company && !companyIds.has(r.company.toLowerCase())) {
        newNames.set(r.company.toLowerCase(), r.company);
      }
    }
    if (newNames.size > 0) {
      await tx.company.createMany({
        data: [...newNames.values()].map((name) => ({ userId, name, tier: "C" as const })),
        skipDuplicates: true,
      });
      const fresh = await tx.company.findMany({
        where: { userId, name: { in: [...newNames.values()] } },
        select: { id: true, name: true },
      });
      for (const c of fresh) companyIds.set(c.name.toLowerCase(), c.id);
    }

    // Contacts: skip anyone already imported (same LinkedIn URL, or same name + company).
    const existingContacts = await tx.contact.findMany({
      where: { userId },
      select: { linkedinUrl: true, fullName: true, companyId: true },
    });
    const seenUrls = new Set(existingContacts.flatMap((c) => (c.linkedinUrl ? [c.linkedinUrl] : [])));
    const seenKeys = new Set(
      existingContacts.map((c) => `${c.fullName.toLowerCase()}|${c.companyId ?? ""}`),
    );

    const data = [];
    let dupes = 0;
    for (const r of rows) {
      const companyId = r.company ? (companyIds.get(r.company.toLowerCase()) ?? null) : null;
      const key = `${r.fullName.toLowerCase()}|${companyId ?? ""}`;
      if ((r.linkedinUrl && seenUrls.has(r.linkedinUrl)) || seenKeys.has(key)) {
        dupes++;
        continue;
      }
      if (r.linkedinUrl) seenUrls.add(r.linkedinUrl);
      seenKeys.add(key);
      data.push({
        userId,
        companyId,
        fullName: r.fullName,
        title: r.title ?? null,
        linkedinUrl: r.linkedinUrl ?? null,
      });
    }

    if (data.length > 0) await tx.contact.createMany({ data });
    return { created: data.length, duplicates: dupes };
  });

  revalidatePath("/contacts");
  revalidatePath("/companies");
  redirect(`${PATH}?imported=${created}&duplicates=${duplicates}&skipped=${skipped}`);
}
