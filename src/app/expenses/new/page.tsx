import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ExpenseForm } from "@/components/ExpenseForm";
import { EmptyState, PageShell } from "@/components/ui";
import { getActiveHousehold, requireUser } from "@/lib/household";
import type { BillType, DefaultShare } from "@/lib/types";

export default async function NewExpensePage() {
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login");

  const { household, members } = await getActiveHousehold(user.id);

  if (!household) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <PageShell title="Add expense">
          <EmptyState
            title="Join a household first"
            description="Create or join a household from the dashboard before adding bills."
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
    .eq("household_id", household.id);

  const defaultRows = (defaults ?? []) as DefaultShare[];
  const firstLabel = defaultRows[0]?.label;
  const { data: billTypeRows } = await supabase
    .from("bill_types")
    .select("*")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  const defaultPercents: Record<string, number> = {};
  if (firstLabel) {
    defaultRows
      .filter((d) => d.label === firstLabel)
      .forEach((d) => {
        defaultPercents[d.user_id] = Number(d.percentage);
      });
  }

  return (
    <div className="min-h-screen">
      <AppNav />
      <PageShell
        title="Add a bill"
        subtitle={`Split an expense across ${household.name}`}
      >
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-sm">
          <ExpenseForm
            householdId={household.id}
            members={members}
            currentUserId={user.id}
            billTypes={(billTypeRows ?? []) as BillType[]}
            defaultPercents={
              Object.keys(defaultPercents).length > 0
                ? defaultPercents
                : undefined
            }
          />
        </div>
      </PageShell>
    </div>
  );
}
