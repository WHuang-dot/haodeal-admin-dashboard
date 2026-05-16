import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layouts/dashboard-layout";

function getAllowedEmails(): string[] {
  const env = process.env.ALLOWED_EMAILS;
  if (!env || env.trim() === "") return [];
  return env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  const allowedEmails = getAllowedEmails();

  // Check email against allowlist
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email || !allowedEmails.includes(email)) {
    redirect("/access-denied");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
