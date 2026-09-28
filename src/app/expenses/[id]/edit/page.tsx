import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { ExpenseForm } from "@/components/ExpenseForm";
import { EmptyState, PageShell } from "@/components/ui";
import { getActiveHousehold, requireUser } from "@/lib/household";
import type { BillType, ExpenseWithShares } from "@/lib/types";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login");

  const { household, members } = await getActiveHousehold(user.id);

  if (!household) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <PageShell title="Edit bill">
          <EmptyState
            title="Join a household first"
            description="Create or join a household from the dashboard before editing bills."
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

  const { data: expenseRow } = await supabase
    .from("expenses")
    .select("*, expense_shares(*), expense_items(*)")
    .eq("id", id)
    .eq("household_id", household.id)
    .maybeSingle();

  if (!expenseRow) notFound();

  const { data: billTypeRows } = await supabase
    .from("bill_types")
    .select("*")
    .eq("household_id", household.id)
    .order("created_at", { ascending: true });

  const expense = expenseRow as ExpenseWithShares;

  return (
    <div className="min-h-screen">
      <AppNav />
      <PageShell
        title="Edit bill"
        subtitle={`Update ${expense.title} in ${household.name}`}
      >
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-sm">
          <ExpenseForm
            householdId={household.id}
            members={members}
            currentUserId={user.id}
            billTypes={(billTypeRows ?? []) as BillType[]}
            expense={expense}
          />
          <div className="mt-4">
            <DeleteExpenseButton
              expenseId={expense.id}
              title={expense.title}
              redirectTo="/dashboard"
            />
          </div>
        </div>
      </PageShell>
    </div>
  );
}
