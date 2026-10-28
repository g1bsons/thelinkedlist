import Link from "next/link";
import { signOut } from "@/lib/auth";
import { requireUserId } from "@/lib/dal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUserId();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <nav className="flex items-center gap-6 text-sm font-medium">
          <span className="font-semibold">Outreach Planner</span>
          <Link href="/companies" className="hover:underline">
            Companies
          </Link>
          <Link href="/contacts" className="hover:underline">
            Contacts
          </Link>
             <Link href="/import" className="hover:underline">
                Import
             </Link>
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="text-sm text-zinc-500 hover:underline">
            Sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
