import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { HouseholdManager } from "@/components/HouseholdManager";
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
        subtitle="Members, invite code, and share presets. You can belong to more than one household."
      >
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-100">Your households</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {mine.map((item) => (
              <li
                key={item.id}
                className={`rounded-full border px-3 py-1 text-sm ${
                  item.id === household.id
                    ? "border-teal-500 bg-teal-950 text-teal-100"
                    : "border-slate-700 bg-slate-900 text-slate-200"
                }`}
              >
                {item.name}
                <span className="ml-1 text-slate-400">· {item.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Use the household menu in the header to switch. The pages then show that household&apos;s bills.
          </p>
        </section>
        <HouseholdManager
          household={household}
          members={members}
          defaults={(defaults ?? []) as DefaultShare[]}
          isOrganizer={membership.role === "organizer"}
          currentUserId={user.id}
        />
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
