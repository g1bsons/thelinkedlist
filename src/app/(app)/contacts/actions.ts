"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { cleanForm, withError } from "@/lib/forms";
import { STAGES } from "@/lib/domain";
import { contactInput } from "@/lib/validators";

const PATH = "/contacts";

export async function createContact(formData: FormData) {
  const userId = await requireUserId();

  const parsed = contactInput.safeParse(cleanForm(formData, ["affinity"]));
  if (!parsed.success) {
    redirect(withError(PATH, parsed.error.issues[0]?.message ?? "Invalid contact"));
  }

  // A company id from the form is untrusted: it must belong to this user.
  const { companyId, ...rest } = parsed.data;
  if (companyId) {
    const owned = await db.company.findFirst({
      where: { id: companyId, userId },
      select: { id: true },
    });
    if (!owned) redirect(withError(PATH, "Unknown company"));
  }

  await db.contact.create({
    data: { ...rest, companyId: companyId ?? null, userId },
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateContactStage(formData: FormData) {
  const userId = await requireUserId();

  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !(STAGES as readonly string[]).includes(stage)) {
    redirect(withError(PATH, "Invalid stage"));
  }

  await db.contact.updateMany({
    where: { id, userId },
    data: { stage: stage as (typeof STAGES)[number] },
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteContact(formData: FormData) {
  const userId = await requireUserId();

  const id = String(formData.get("id") ?? "");
  if (id) {
    await db.contact.deleteMany({ where: { id, userId } });
  }

  revalidatePath(PATH);
  redirect(PATH);
}
