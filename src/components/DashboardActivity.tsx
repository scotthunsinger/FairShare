"use client";

import { useState } from "react";
import Link from "next/link";
import { BillIcon } from "@/components/BillIcon";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { EmptyState } from "@/components/ui";
import { buildBalanceMatrix, formatCurrency, memberName } from "@/lib/balance";
import { findBillType, type BillType, type ExpenseWithShares, type HouseholdMember } from "@/lib/types";

const RECENT_COUNT = 3;

export function DashboardActivity({
  expenses,
  members,
  billTypes,
}: {
  expenses: ExpenseWithShares[];
  members: HouseholdMember[];
  billTypes: BillType[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visibleExpenses = showAll ? expenses : expenses.slice(0, RECENT_COUNT);
  const debts = buildBalanceMatrix(visibleExpenses, true);
  const canToggle = expenses.length > RECENT_COUNT;

  return (
    <>
      <label className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm">
        <span className="font-medium text-slate-200">Expenses and balances</span>
        <select
          value={showAll ? "all" : "recent"}
          onChange={(event) => setShowAll(event.target.value === "all")}
          disabled={!canToggle}
          className="rounded-md border border-slate-600 bg-slate-950 px-3 py-1.5 text-slate-100 outline-none ring-teal-400/30 focus:ring-2 disabled:opacity-60"
        >
          <option value="recent">3 most recent</option>
          <option value="all">All</option>
        </select>
      </label>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-100">Who owes whom this month</h2>
        {debts.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No one owes anyone"
              description="Bills in both directions cancel out, or every share is marked paid."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/80">
            {debts.map((debt) => (
              <li
                key={`${debt.fromUserId}-${debt.toUserId}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="text-slate-200">
                  <span className="font-medium">{memberName(members, debt.fromUserId)}</span> owes{" "}
                  {formatCurrency(debt.amount)}
                </span>
                <span className="text-slate-400">to {memberName(members, debt.toUserId)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-100">Expenses this month</h2>
        {visibleExpenses.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No expenses this month yet"
              description="Add a utility bill, groceries, or shared dinner to get started."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/80">
            {visibleExpenses.map((expense) => {
              const billType = findBillType(billTypes, expense.category);
              return (
                <li key={expense.id} className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <BillIcon type={billType} />
                      <div>
                        <p className="font-medium text-slate-100">{expense.title}</p>
                        <p className="text-slate-400">
                          <span className="capitalize">{expense.category}</span>
                          {" · paid by "}
                          {memberName(members, expense.paid_by)}
                          {expense.due_date ? ` · due ${expense.due_date.slice(0, 10)}` : ""}
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
                      <DeleteExpenseButton expenseId={expense.id} title={expense.title} />
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
                            {Number(item.quantity)} at {formatCurrency(Number(item.unit_cost))} each
                          </span>
                          <span>{formatCurrency(Number(item.quantity) * Number(item.unit_cost))}</span>
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
    </>
  );
}
