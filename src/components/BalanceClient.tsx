"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  buildBalanceMatrix,
  formatCurrency,
  formatMonthLabel,
  memberName,
  totalsByUser,
} from "@/lib/balance";
import { BillIcon } from "@/components/BillIcon";
import { findBillType, type BillType, type ExpenseWithShares, type HouseholdMember } from "@/lib/types";
import { EmptyState, ErrorBanner } from "@/components/ui";

type Props = {
  members: HouseholdMember[];
  expenses: ExpenseWithShares[];
  billTypes: BillType[];
  initialMonth: string;
  availableMonths: string[];
};

export function BalanceClient({
  members,
  expenses,
  billTypes,
  initialMonth,
  availableMonths,
}: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.month === month),
    [expenses, month],
  );

  const matrix = useMemo(
    () => buildBalanceMatrix(monthExpenses, true),
    [monthExpenses],
  );

  const totals = useMemo(() => totalsByUser(monthExpenses), [monthExpenses]);

  async function toggleSharePaid(shareId: string, isPaid: boolean) {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("expense_shares")
      .update({ is_paid: isPaid })
      .eq("id", shareId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    // Mark expense settled when all shares are paid
    const share = monthExpenses
      .flatMap((e) => e.expense_shares.map((s) => ({ ...s, expenseId: e.id })))
      .find((s) => s.id === shareId);

    if (share) {
      const expense = monthExpenses.find((e) => e.id === share.expenseId);
      if (expense) {
        const allPaid = expense.expense_shares.every((s) =>
          s.id === shareId ? isPaid : s.is_paid,
        );
        await supabase
          .from("expenses")
          .update({ is_settled: allPaid })
          .eq("id", expense.id);
      }
    }

    startTransition(() => {
      router.refresh();
    });
  }

  const months =
    availableMonths.length > 0
      ? availableMonths
      : [initialMonth];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-slate-300">
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
          />
        </label>
        {pending ? (
          <span className="text-sm text-slate-500">Refreshing…</span>
        ) : null}
      </div>

      <ErrorBanner message={error} />

      {monthExpenses.length === 0 ? (
        <EmptyState
          title="No expenses this month yet"
          description={`Nothing recorded for ${formatMonthLabel(month)}. Add a bill to see balances.`}
        />
      ) : (
        <>
          <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Responsibility for {formatMonthLabel(month)}
            </h2>
            <ul className="mt-3 divide-y divide-slate-800">
              {members.map((member) => {
                const row = totals.get(member.user_id) ?? {
                  responsibility: 0,
                  unpaid: 0,
                  paidUpfront: 0,
                };
                return (
                  <li
                    key={member.user_id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-100">
                      {member.display_name}
                    </span>
                    <span className="text-slate-400">
                      Share {formatCurrency(row.responsibility)} · Paid upfront{" "}
                      {formatCurrency(row.paidUpfront)} · Unpaid{" "}
                      {formatCurrency(row.unpaid)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Who owes whom
            </h2>
            {matrix.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Everyone is settled for unpaid balances this month.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {matrix.map((edge) => (
                  <li
                    key={`${edge.fromUserId}-${edge.toUserId}`}
                    className="rounded-lg bg-teal-950 px-3 py-2 text-sm text-teal-100"
                  >
                    <span className="font-medium">
                      {memberName(members, edge.fromUserId)}
                    </span>{" "}
                    owes{" "}
                    <span className="font-medium">
                      {memberName(members, edge.toUserId)}
                    </span>{" "}
                    {formatCurrency(edge.amount)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">Expenses</h2>
            {monthExpenses.map((expense) => (
              <article
                key={expense.id}
                className="rounded-xl border border-slate-700 bg-slate-900/80 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <BillIcon type={findBillType(billTypes, expense.category)} />
                    <div>
                    <h3 className="font-medium capitalize text-slate-100">{expense.title}</h3>
                    <p className="text-sm capitalize text-slate-400">
                      {expense.category} · {formatCurrency(Number(expense.amount))} · paid by{" "}
                      {memberName(members, expense.paid_by)}
                    </p>
                    </div>
                  </div>
                  {expense.is_settled ? (
                    <span className="rounded-full bg-teal-950 px-2 py-0.5 text-xs font-medium text-teal-200">
                      Settled
                    </span>
                  ) : null}
                </div>
                <ul className="mt-3 space-y-2">
                  {expense.expense_shares.map((share) => (
                    <li
                      key={share.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-slate-200">
                        {memberName(members, share.user_id)} —{" "}
                        {formatCurrency(Number(share.amount_owed))} (
                        {Number(share.percentage)}%)
                      </span>
                      <label className="inline-flex items-center gap-2 text-slate-300">
                        <input
                          type="checkbox"
                          checked={share.is_paid}
                          onChange={(e) =>
                            toggleSharePaid(share.id, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-500 text-teal-300 focus:ring-teal-400"
                        />
                        Paid
                      </label>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        </>
      )}

      {months.length > 1 ? (
        <p className="text-xs text-slate-400">
          Months with activity: {months.map(formatMonthLabel).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
