import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) redirect("/companies");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Outreach Planner</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Rank target employers, organize your LinkedIn connections, and run focused weekly
        outreach sessions.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/companies" });
        }}
      >
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
