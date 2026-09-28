import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Household, HouseholdMember, HouseholdRole } from "@/lib/types";

export const HOUSEHOLD_COOKIE = "fairshare-household";

export type HouseholdOption = {
  id: string;
  name: string;
  role: HouseholdRole;
};

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

export async function listMyHouseholds(userId: string): Promise<HouseholdOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("household_members")
    .select("role, joined_at, households(id, name)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  return (data ?? []).flatMap((row) => {
    const nested = row.households as { id: string; name: string } | { id: string; name: string }[] | null;
    const household = Array.isArray(nested) ? nested[0] : nested;
    if (!household) return [];
    return [{ id: household.id, name: household.name, role: row.role as HouseholdRole }];
  });
}

export async function getActiveHousehold(userId: string): Promise<{
  household: Household | null;
  membership: HouseholdMember | null;
  members: HouseholdMember[];
}> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const preferredId = cookieStore.get(HOUSEHOLD_COOKIE)?.value;

  const { data: memberships } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  const membership =
    memberships?.find((row) => row.household_id === preferredId) ??
    memberships?.[0] ??
    null;

  if (!membership) {
    return { household: null, membership: null, members: [] };
  }

  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("id", membership.household_id)
    .single();

  const { data: members } = await supabase
    .from("household_members")
    .select("*")
    .eq("household_id", membership.household_id)
    .order("joined_at", { ascending: true });

  return {
    household: household as Household | null,
    membership: membership as HouseholdMember,
    members: (members ?? []) as HouseholdMember[],
  };
}
