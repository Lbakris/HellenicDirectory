"use server";

import { cookies } from "next/headers";
import type { User } from "../../shared/src/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getServerSession(): Promise<{ user: User; accessToken: string } | null> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get("hd_access")?.value;
  if (!accessToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { user } = await res.json();
    return { user, accessToken };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getServerSession();
  if (!session) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return session!;
}
