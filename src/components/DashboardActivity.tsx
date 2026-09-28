"use client";

import { useState } from "react";
import Link from "next/link";
import { BillIcon } from "@/components/BillIcon";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { EmptyState } from "@/components/ui";
import { formatCurrency, listOpenDebts, listRecentOpenDebts, memberName } from "@/lib/balance";
import { findBillType, type BillType, type ExpenseWithShares, type HouseholdMember } from "@/lib/types";

const RECENT_COUNT = 3;
type ListView = "all" | "due" | "recent";

const VIEWS: { id: ListView; label: string }[] = [
  { id: "all", label: "Show all" },
  { id: "due", label: "Due" },
  { id: "recent", label: "Recent" },
];

export function DashboardActivity({
  expenses,
  members,
  billTypes,
}: {
  expenses: ExpenseWithShares[];
  members: HouseholdMember[];
  billTypes: BillType[];
}) {
  const [debtView, setDebtView] = useState<ListView>("recent");
  const [expenseView, setExpenseView] = useState<ListView>("recent");
  const today = localDateKey(new Date());
  const visibleExpenses = filterExpenses(expenses, expenseView, today);
  const debts =
    debtView === "recent"
      ? listRecentOpenDebts(expenses, RECENT_COUNT)
      : listOpenDebts(filterExpenses(expenses, debtView, today));

  return (
    <>
      <section className="mt-8">
        <SectionHeading
          title="Who owes whom this month"
          view={debtView}
          onChange={setDebtView}
        />
        {debts.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={debtView === "due" ? "Nothing due to settle" : "No one owes anyone"}
              description={
                debtView === "due"
                  ? "No upcoming bills still need to be paid between roommates."
                  : "Every share in this view is already marked paid."
              }
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
        <SectionHeading
          title="Expenses this month"
          view={expenseView}
          onChange={setExpenseView}
        />
        {visibleExpenses.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={expenseView === "due" ? "Nothing due" : "No expenses this month yet"}
              description={
                expenseView === "due"
                  ? "No upcoming bills still need to be settled."
                  : "Add a utility bill, groceries, or shared dinner to get started."
              }
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

function SectionHeading({
  title,
  view,
  onChange,
}: {
  title: string;
  view: ListView;
  onChange: (view: ListView) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      <div className="flex gap-1">
        {VIEWS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${
              view === option.id
                ? "bg-teal-950 text-teal-100"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function filterExpenses(expenses: ExpenseWithShares[], view: ListView, today: string) {
  if (view === "recent") return expenses.slice(0, RECENT_COUNT);
  if (view === "due") return expenses.filter((expense) => isUpcomingAndOpen(expense, today));
  return expenses;
}

function isUpcomingAndOpen(expense: ExpenseWithShares, today: string) {
  const due = expense.due_date?.slice(0, 10);
  if (!due || due < today) return false;
  if (expense.is_settled) return false;
  return expense.expense_shares.some(
    (share) =>
      !share.is_paid && share.user_id !== expense.paid_by && Number(share.amount_owed) > 0,
  );
}

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
