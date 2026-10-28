import { requireUserId } from "@/lib/dal";
import { importConnections } from "./actions";

const button =
  "rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; imported?: string; duplicates?: string; skipped?: string }>;
}) {
  await requireUserId();
  const { error, imported, duplicates, skipped } = await searchParams;

  return (
    <section className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import connections</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload the <code>Connections.csv</code> file from your LinkedIn data export.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {imported !== undefined && !error && (
        <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
          Imported {imported} contacts. {duplicates ?? 0} already existed
          {Number(skipped) > 0 ? `, ${skipped} rows had no name and were skipped` : ""}.
        </p>
      )}

      <form action={importConnections} className="space-y-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm"
        />
        <button type="submit" className={button}>
          Import
        </button>
      </form>

      <details className="text-sm text-zinc-500">
        <summary className="cursor-pointer">How do I get this file?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>On LinkedIn, open Settings &amp; Privacy, then Data privacy, then Get a copy of your data.</li>
          <li>Choose “Connections” only and request the archive.</li>
          <li>When LinkedIn emails you, download and unzip it, and upload <code>Connections.csv</code> here.</li>
        </ol>
        <p className="mt-2">
          New companies are added at tier C. Re-importing is safe: people already in your list
          are skipped. Files up to 1 MB are accepted.
        </p>
      </details>
    </section>
  );
}
