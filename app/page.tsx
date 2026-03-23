import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { dashboardPathForRole } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(dashboardPathForRole(session.role));
  redirect("/login");
}




