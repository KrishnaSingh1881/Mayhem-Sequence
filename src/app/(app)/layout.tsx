import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { verifyToken } from "@/lib/auth";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const token = cookies().get("ms_token")?.value;
  if (!token || !(await verifyToken(token))) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
