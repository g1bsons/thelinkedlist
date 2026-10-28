"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { cleanForm, withError } from "@/lib/forms";
import { TIERS } from "@/lib/domain";
import { companyInput } from "@/lib/validators";

const PATH = "/companies";

export async function createCompany(formData: FormData) {
  const userId = await requireUserId();

  const parsed = companyInput.safeParse(cleanForm(formData));
  if (!parsed.success) {
    redirect(withError(PATH, parsed.error.issues[0]?.message ?? "Invalid company"));
  }

  let error: string | undefined;
  try {
    await db.company.create({ data: { ...parsed.data, userId } });
  } catch (e) {
    // P2002 = unique constraint (userId, name)
    if ((e as { code?: string }).code === "P2002") {
      error = "You already have a company with that name";
    } else {
      throw e;
    }
  }
  if (error) redirect(withError(PATH, error));

  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateCompanyTier(formData: FormData) {
  const userId = await requireUserId();

  const id = String(formData.get("id") ?? "");
  const tier = String(formData.get("tier") ?? "");
  if (!id || !(TIERS as readonly string[]).includes(tier)) {
    redirect(withError(PATH, "Invalid tier"));
  }

  // Scoped by userId so one user can never change another user's row.
  await db.company.updateMany({
    where: { id, userId },
    data: { tier: tier as (typeof TIERS)[number] },
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteCompany(formData: FormData) {
  const userId = await requireUserId();

  const id = String(formData.get("id") ?? "");
  if (id) {
    await db.company.deleteMany({ where: { id, userId } });
  }

  revalidatePath(PATH);
  revalidatePath("/contacts");
  redirect(PATH);
}
