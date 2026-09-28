"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { HOUSEHOLD_COOKIE } from "@/lib/household";

export async function selectHousehold(householdId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .eq("household_id", householdId)
    .maybeSingle();

  if (!membership) return;

  const cookieStore = await cookies();
  cookieStore.set(HOUSEHOLD_COOKIE, householdId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
