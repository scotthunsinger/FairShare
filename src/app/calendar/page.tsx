import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { CalendarView } from "@/components/CalendarView";
import { EmptyState, PageShell } from "@/components/ui";
import { currentMonth } from "@/lib/balance";
import { ensurePayerSharesPaid } from "@/lib/payer-shares";
import { getActiveHousehold, requireUser } from "@/lib/household";
import type { ExpenseWithShares } from "@/lib/types";

export default async function CalendarPage() {
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login?next=/calendar");

  const { household } = await getActiveHousehold(user.id);

  if (!household) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <PageShell title="Calendar">
          <EmptyState
            title="No household yet"
            description="Create or join a household to see when bills were added, paid, and due."
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

  const { data } = await supabase
    .from("expenses")
    .select("*, expense_shares(*)")
    .eq("household_id", household.id)
    .order("created_at", { ascending: false });

  const expenses = await ensurePayerSharesPaid(
    supabase,
    (data ?? []) as ExpenseWithShares[],
  );

  return (
    <div className="min-h-screen">
      <AppNav />
      <PageShell
        title="Calendar"
        subtitle={`${household.name}: days a bill was added, paid off, or is due.`}
      >
        <CalendarView expenses={expenses} initialMonth={currentMonth()} />
      </PageShell>
    </div>
  );
}
