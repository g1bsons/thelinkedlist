import { db } from "@/lib/db";
import { requireUserId } from "@/lib/dal";
import { TIERS } from "@/lib/domain";
import { createCompany, deleteCompany, updateCompanyTier } from "./actions";

const input =
  "rounded border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700";
const button =
  "rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const userId = await requireUserId();
  const { error } = await searchParams;

  const companies = await db.company.findMany({
    where: { userId },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
    include: { _count: { select: { contacts: true } } },
  });

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Target employers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tier A are your top choices, then B, then C.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={createCompany} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Company
          <input name="name" required maxLength={120} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tier
          <select name="tier" defaultValue="B" className={input}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          Notes
          <input name="notes" maxLength={2000} className={input} />
        </label>
        <button type="submit" className={button}>
          Add
        </button>
      </form>

      {companies.length === 0 ? (
        <p className="text-sm text-zinc-500">No companies yet. Add your first target above.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {companies.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 py-3">
              <div className="min-w-48 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-zinc-500">
                  {c._count.contacts} {c._count.contacts === 1 ? "contact" : "contacts"}
                  {c.notes ? ` · ${c.notes}` : ""}
                </p>
              </div>
              <form action={updateCompanyTier} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <select name="tier" defaultValue={c.tier} className={input} aria-label={`Tier for ${c.name}`}>
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button type="submit" className="text-sm underline">
                  Save
                </button>
              </form>
              <form action={deleteCompany}>
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
