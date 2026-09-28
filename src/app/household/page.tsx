import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { HouseholdChoices } from "@/components/HouseholdChoices";
import { HouseholdExit } from "@/components/HouseholdExit";
import { HouseholdManager } from "@/components/HouseholdManager";
import { HouseholdNameEditor } from "@/components/HouseholdNameEditor";
import { HouseholdOnboarding } from "@/components/HouseholdOnboarding";
import { PageShell } from "@/components/ui";
import { getActiveHousehold, listMyHouseholds, requireUser } from "@/lib/household";
import type { DefaultShare } from "@/lib/types";

export default async function HouseholdPage() {
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login");

  const [{ household, members, membership }, mine] = await Promise.all([
    getActiveHousehold(user.id),
    listMyHouseholds(user.id),
  ]);

  if (!household || !membership) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <PageShell title="Household">
          <HouseholdOnboarding />
        </PageShell>
      </div>
    );
  }

  const { data: defaults } = await supabase
    .from("default_shares")
    .select("*")
    .eq("household_id", household.id)
    .order("label", { ascending: true });

  return (
    <div className="min-h-screen">
      <AppNav />
      <PageShell
        title={household.name}
        headingExtra={
          membership.role === "organizer" ? (
            <HouseholdNameEditor householdId={household.id} name={household.name} />
          ) : null
        }
        subtitle="Members, invite code, and share presets. You can belong to more than one household."
      >
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-100">Your households</h2>
          <HouseholdChoices households={mine} activeId={household.id} />
          <p className="mt-2 text-xs text-slate-500">
            Click a household to open it. The pages then show that household&apos;s bills.
          </p>
        </section>
        <HouseholdManager
          household={household}
          members={members}
          defaults={(defaults ?? []) as DefaultShare[]}
          isOrganizer={membership.role === "organizer"}
          currentUserId={user.id}
        />
        <div className="mt-6">
          <HouseholdExit
            householdId={household.id}
            householdName={household.name}
            isOrganizer={membership.role === "organizer"}
            memberCount={members.length}
          />
        </div>
        <div className="mt-10">
          <HouseholdOnboarding
            heading="Create or join another household"
            detail="Start a second household, or join one with a different invite code."
          />
        </div>
      </PageShell>
    </div>
  );
}
