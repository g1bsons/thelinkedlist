import { db } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { AFFINITIES, STAGES, type Tier } from "@/lib/domain";
import { priorityScore } from "@/lib/priority";
import { createContact, deleteContact, updateContactStage } from "./actions";

const input =
  "rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700";
const button =
  "rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900";

const label = (s: string) =>
  s.charAt(0) + s.slice(1).toLowerCase().replaceAll("_", " ");

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await requireUserId();
  const { error } = await searchParams;
  const now = new Date();

  const [companies, contacts] = await Promise.all([
    db.company.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    db.contact.findMany({
      where: { userId },
      include: {
        company: true,
        outreach: { orderBy: { sentAt: "desc" }, take: 1, select: { sentAt: true } },
      },
    }),
  ]);

  // Contacts without a company fall back to the lowest tier.
  const rows = contacts
    .map((c) => ({
      contact: c,
      score: priorityScore(
        {
          tier: (c.company?.tier ?? "C") as Tier,
          affinity: c.affinity,
          stage: c.stage,
          lastTouchAt: c.outreach[0]?.sentAt ?? null,
        },
        now,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.contact.fullName.localeCompare(b.contact.fullName));

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sorted by priority: who to reach out to first. Finished contacts sink to the bottom.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={createContact} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Full name
          <input name="fullName" required maxLength={120} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input name="title" maxLength={120} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Company
          <select name="companyId" defaultValue="" className={input}>
            <option value="">No company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.tier})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          LinkedIn URL
          <input name="linkedinUrl" type="url" placeholder="https://www.linkedin.com/in/..." className={input} />
        </label>
        <fieldset className="flex flex-wrap items-center gap-3 text-sm sm:col-span-2">
          <legend className="mb-1">Shared affinity</legend>
          {AFFINITIES.map((a) => (
            <label key={a} className="flex items-center gap-1.5">
              <input type="checkbox" name="affinity" value={a} />
              {label(a)}
            </label>
          ))}
        </fieldset>
        <div className="sm:col-span-2">
          <button type="submit" className={button}>
            Add contact
          </button>
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No contacts yet. Add one above.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map(({ contact: c, score }) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{c.fullName}</p>
                <p className="text-sm text-zinc-500">
                  {[c.title, c.company?.name].filter(Boolean).join(" at ") || "No title or company"}
                  {c.affinity.length > 0 ? ` · ${c.affinity.map(label).join(", ")}` : ""}
                </p>
              </div>
              <span className="w-16 text-sm tabular-nums text-zinc-500" title="Priority score">
                {score}
              </span>
              <form action={updateContactStage} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <select name="stage" defaultValue={c.stage} className={input} aria-label={`Stage for ${c.fullName}`}>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-sm underline">
                  Save
                </button>
              </form>
              <form action={deleteContact}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-sm text-red-600 hover:underline">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
