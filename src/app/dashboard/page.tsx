import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { DashboardActivity } from "@/components/DashboardActivity";
import { HouseholdOnboarding } from "@/components/HouseholdOnboarding";
import { PageShell } from "@/components/ui";
import {
  currentMonth,
  formatCurrency,
  formatMonthLabel,
  netOwedByUser,
} from "@/lib/balance";
import { ensurePayerSharesPaid } from "@/lib/payer-shares";
import { getActiveHousehold, requireUser } from "@/lib/household";
import type { BillType, ExpenseWithShares } from "@/lib/types";

export default async function DashboardPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const { household, members, membership } = await getActiveHousehold(user.id);

  if (!household || !membership) {
    return (
      <div className="min-h-screen">
        <AppNav />
        <PageShell
          title="Welcome to FairShare"
          subtitle="Create or join a household to start splitting expenses."
        >
          <HouseholdOnboarding />
        </PageShell>
      </div>
    );
  }

  const { supabase } = await requireUser();
  const month = currentMonth();

  const { data: expensesData } = await supabase
    .from("expenses")
    .select("*, expense_shares(*), expense_items(*)")
    .eq("household_id", household.id)
    .eq("month", month)
    .order("created_at", { ascending: false });

  const { data: billTypeRows } = await supabase
    .from("bill_types")
    .select("*")
    .eq("household_id", household.id);

  const billTypes = (billTypeRows ?? []) as BillType[];
  const expenses = await ensurePayerSharesPaid(
    supabase,
    (expensesData ?? []) as ExpenseWithShares[],
  );
  const monthTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const myShares = expenses.flatMap((e) =>
    e.expense_shares.filter((s) => s.user_id === user.id),
  );
  const myOwed = myShares.reduce((sum, s) => sum + Number(s.amount_owed), 0);
  const myUnpaid = netOwedByUser(expenses).get(user.id) ?? 0;

  return (
    <div className="min-h-screen">
      <AppNav />
      <PageShell
        title={household.name}
        subtitle={`${formatMonthLabel(month)} overview`}
        actions={
          <Link
            href="/expenses/new"
            className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-medium text-on-accent hover:bg-teal-300"
          >
            Add expense
          </Link>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Month total" value={formatCurrency(monthTotal)} />
          <Stat label="Your share" value={formatCurrency(myOwed)} />
          <Stat label="You still owe" value={formatCurrency(myUnpaid)} />
        </div>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-100">Roommates</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200"
              >
                {m.display_name}
                <span className="ml-1 text-slate-400">· {m.role}</span>
              </li>
            ))}
          </ul>
        </section>

        <DashboardActivity expenses={expenses} members={members} billTypes={billTypes} />
      </PageShell>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-50">{value}</p>
    </div>
  );
}
