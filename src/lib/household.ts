import { createClient } from "@/lib/supabase/server";
import type { Household, HouseholdMember } from "@/lib/types";

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

export async function getActiveHousehold(userId: string): Promise<{
  household: Household | null;
  membership: HouseholdMember | null;
  members: HouseholdMember[];
}> {
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("household_members")
    .select("*")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

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
