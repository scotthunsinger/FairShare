import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { BudgetBoard } from "@/components/BudgetBoard";
import { EmptyState, PageShell } from "@/components/ui";
import { getActiveHousehold, requireUser } from "@/lib/household";
import type { Budget, ExpenseWithShares } from "@/lib/types";

export default async function BudgetPage() {
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login?next=/budget");

  const { household } = await getActiveHousehold(user.id);

  if (!household) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <PageShell title="Budget">
          <EmptyState
            title="No household yet"
            description="Create or join a household to set a budget."
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

  const [{ data: expenseRows }, { data: budgetRows }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, expense_shares(*)")
      .eq("household_id", household.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("budgets")
      .select("*")
      .eq("household_id", household.id)
      .eq("user_id", user.id)
      .order("period_start", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen">
      <AppNav />
      <PageShell
        title="Budget"
        subtitle={`Your share of bills in ${household.name}, subtracted from the budget you set.`}
      >
        <BudgetBoard
          householdId={household.id}
          userId={user.id}
          expenses={(expenseRows ?? []) as ExpenseWithShares[]}
          budgets={(budgetRows ?? []) as Budget[]}
          today={new Date().toISOString().slice(0, 10)}
        />
      </PageShell>
    </div>
  );
}
