import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { HouseholdManager } from "@/components/HouseholdManager";
import { EmptyState, PageShell } from "@/components/ui";
import { getActiveHousehold, requireUser } from "@/lib/household";
import type { DefaultShare } from "@/lib/types";

export default async function HouseholdPage() {
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login");

  const { household, members, membership } = await getActiveHousehold(user.id);

  if (!household || !membership) {
    return (
      <div className="min-h-screen">
        <Nav email={user.email} />
        <PageShell title="Household">
          <EmptyState
            title="No household yet"
            description="Create or join a household from the dashboard."
          />
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-teal-300 hover:text-teal-100"
          >
            Go to dashboard
          </Link>
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
      <Nav email={user.email} />
      <PageShell
        title={household.name}
        subtitle="Members, invite code, and share presets"
      >
        <HouseholdManager
          household={household}
          members={members}
          defaults={(defaults ?? []) as DefaultShare[]}
          isOrganizer={membership.role === "organizer"}
          currentUserId={user.id}
        />
      </PageShell>
    </div>
  );
}
