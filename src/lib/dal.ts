import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Returns the signed-in user's id, or redirects to the sign-in page.
 * Call it in every page and every Server Action: the page being behind a
 * login is not enough, because actions can be invoked directly.
 */
export const requireUserId = cache(async (): Promise<string> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/");
  return id;
});
