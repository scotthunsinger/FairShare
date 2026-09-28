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

export async function leaveHousehold(householdId: string) {
  return exitHousehold("leave_household", householdId);
}

export async function deleteHousehold(householdId: string) {
  return exitHousehold("delete_household", householdId);
}

async function exitHousehold(
  fn: "leave_household" | "delete_household",
  householdId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase.rpc(fn, { p_household_id: householdId });
  if (error) return { error: error.message };

  const { data: remaining } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const nextId = remaining?.[0]?.household_id;
  const cookieStore = await cookies();
  if (!nextId) {
    cookieStore.delete(HOUSEHOLD_COOKIE);
  } else {
    cookieStore.set(HOUSEHOLD_COOKIE, nextId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return { error: "" };
}
