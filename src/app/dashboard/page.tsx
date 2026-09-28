import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { HouseholdOnboarding } from "@/components/HouseholdOnboarding";
import { EmptyState, PageShell } from "@/components/ui";
import {
  currentMonth,
  formatCurrency,
  formatMonthLabel,
  memberName,
} from "@/lib/balance";
import { getActiveHousehold, requireUser } from "@/lib/household";
import { BillIcon } from "@/components/BillIcon";
import { findBillType, type BillType, type ExpenseWithShares } from "@/lib/types";

export default async function DashboardPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  const { household, members, membership } = await getActiveHousehold(user.id);

  if (!household || !membership) {
    return (
      <div className="min-h-screen">
        <Nav email={user.email} />
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
  const expenses = (expensesData ?? []) as ExpenseWithShares[];
  const monthTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const myShares = expenses.flatMap((e) =>
    e.expense_shares.filter((s) => s.user_id === user.id),
  );
  const myOwed = myShares.reduce((sum, s) => sum + Number(s.amount_owed), 0);
  const myUnpaid = myShares
    .filter((s) => !s.is_paid)
    .reduce((sum, s) => sum + Number(s.amount_owed), 0);

  const unpaidShares = expenses.flatMap((e) =>
    e.expense_shares
      .filter((s) => !s.is_paid)
      .map((s) => ({
        ...s,
        title: e.title,
        paid_by: e.paid_by,
      })),
  );

  return (
    <div className="min-h-screen">
      <Nav email={user.email} />
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

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-100">
            Unpaid balances this month
          </h2>
          {unpaidShares.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No unpaid balances"
                description="Everyone is caught up for this month."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/80">
              {unpaidShares.map((share) => (
                <li
                  key={share.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <span className="text-slate-200">
                    <span className="font-medium">
                      {memberName(members, share.user_id)}
                    </span>{" "}
                    owes {formatCurrency(Number(share.amount_owed))} on{" "}
                    {share.title}
                  </span>
                  <span className="text-slate-400">
                    to {memberName(members, share.paid_by)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-100">
            Expenses this month
          </h2>
          {expenses.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                title="No expenses this month yet"
                description="Add a utility bill, groceries, or shared dinner to get started."
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/80">
              {expenses.map((expense) => {
                const billType = findBillType(billTypes, expense.category);
                return (
                <li
                  key={expense.id}
                  className="px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <BillIcon type={billType} />
                    <div>
                    <p className="font-medium text-slate-100">{expense.title}</p>
                    <p className="text-slate-400">
                      <span className="capitalize">{expense.category}</span>
                      {" · paid by "}
                      {memberName(members, expense.paid_by)}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                  <p className="font-medium text-slate-100">
                    {formatCurrency(Number(expense.amount))}
                  </p>
                  <Link
                    href={`/expenses/${expense.id}/edit`}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-teal-200 hover:bg-slate-800"
                  >
                    Edit
                  </Link>
                  </div>
                  </div>
                  {(expense.expense_items ?? []).length > 0 ? (
                    <ul className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-xs text-slate-300">
                      {expense.expense_items?.map((item) => (
                        <li key={item.id} className="flex flex-wrap justify-between gap-2">
                          <span>
                            <span className="capitalize">{item.kind}</span>
                            {" · "}
                            {item.name}
                            {" · "}
                            {Number(item.quantity)} at{" "}
                            {formatCurrency(Number(item.unit_cost))} each
                          </span>
                          <span>
                            {formatCurrency(Number(item.quantity) * Number(item.unit_cost))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
                      Nothing listed on this bill.
                    </p>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </section>
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
