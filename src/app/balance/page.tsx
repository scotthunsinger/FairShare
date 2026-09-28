import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { BalanceClient } from "@/components/BalanceClient";
import { EmptyState, PageShell } from "@/components/ui";
import { currentMonth } from "@/lib/balance";
import { getActiveHousehold, requireUser } from "@/lib/household";
import type { BillType, ExpenseWithShares } from "@/lib/types";

export default async function BalancePage() {
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login");

  const { household, members } = await getActiveHousehold(user.id);

  if (!household) {
    return (
      <div className="min-h-screen">
        <Nav email={user.email} />
        <PageShell title="Monthly balance">
          <EmptyState
            title="No household yet"
            description="Create or join a household to see balances."
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

  const { data: expensesData } = await supabase
    .from("expenses")
    .select("*, expense_shares(*)")
    .eq("household_id", household.id)
    .order("month", { ascending: false });

  const { data: billTypeRows } = await supabase
    .from("bill_types")
    .select("*")
    .eq("household_id", household.id);

  const expenses = (expensesData ?? []) as ExpenseWithShares[];
  const availableMonths = Array.from(
    new Set(expenses.map((e) => e.month)),
  ).sort((a, b) => b.localeCompare(a));
  const initialMonth = availableMonths[0] ?? currentMonth();

  return (
    <div className="min-h-screen">
      <Nav email={user.email} />
      <PageShell
        title="Monthly balance"
        subtitle={`Who owes whom in ${household.name}`}
      >
        <BalanceClient
          members={members}
          expenses={expenses}
          billTypes={(billTypeRows ?? []) as BillType[]}
          initialMonth={initialMonth}
          availableMonths={availableMonths}
        />
      </PageShell>
    </div>
  );
}
