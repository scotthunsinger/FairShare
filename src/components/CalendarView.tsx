"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatMonthLabel } from "@/lib/balance";
import type { ExpenseWithShares } from "@/lib/types";

type Kind = "due" | "done" | "added";

type CalendarItem = {
  id: string;
  title: string;
  amount: number;
  category: string;
  kind: Kind;
  date: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function expenseSettled(expense: ExpenseWithShares) {
  const shares = expense.expense_shares ?? [];
  return expense.is_settled || (shares.length > 0 && shares.every((share) => share.is_paid));
}

function buildItems(expenses: ExpenseWithShares[]): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const expense of expenses) {
    const settled = expenseSettled(expense);
    const added = expense.created_at.slice(0, 10);
    const due = expense.due_date?.slice(0, 10) ?? null;
    items.push({
      id: `${expense.id}-added`,
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category,
      kind: "added",
      date: added,
    });
    if (due) {
      items.push({
        id: `${expense.id}-due`,
        title: expense.title,
        amount: Number(expense.amount),
        category: expense.category,
        kind: settled ? "done" : "due",
        date: due,
      });
    } else if (settled) {
      items.push({
        id: `${expense.id}-done`,
        title: expense.title,
        amount: Number(expense.amount),
        category: expense.category,
        kind: "done",
        date: added,
      });
    }
  }
  return items;
}

const kindLabel: Record<Kind, string> = {
  due: "Due",
  done: "Done",
  added: "Added",
};

const kindClass: Record<Kind, string> = {
  due: "bg-rose-400",
  done: "bg-teal-300",
  added: "bg-slate-400",
};

export function CalendarView({
  expenses,
  initialMonth,
}: {
  expenses: ExpenseWithShares[];
  initialMonth: string;
}) {
  const items = useMemo(() => buildItems(expenses), [expenses]);
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState(() => {
    const today = new Date();
    const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
    return todayKey.startsWith(initialMonth) ? todayKey : `${initialMonth}-01`;
  });

  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const inMonth = items.filter((item) => item.date.startsWith(month));
  const selectedItems = inMonth.filter((item) => item.date === selected);

  function openMonth(nextMonth: string) {
    setMonth(nextMonth);
    setSelected(`${nextMonth}-01`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-50">{formatMonthLabel(month)}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => openMonth(shiftMonth(month, -1))}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-800"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => openMonth(shiftMonth(month, 1))}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-800"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
        <Legend kind="due" />
        <Legend kind="done" />
        <Legend kind="added" />
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} />;
          const key = dateKey(year, monthNumber - 1, day);
          const dayItems = inMonth.filter((item) => item.date === key);
          const kinds = [...new Set(dayItems.map((item) => item.kind))];
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`min-h-16 rounded-lg border px-1 py-2 text-left text-sm ${
                active
                  ? "border-teal-400 bg-teal-950 text-teal-50"
                  : "border-slate-800 bg-slate-900/70 text-slate-100 hover:bg-slate-800"
              }`}
            >
              <span className="block px-1">{day}</span>
              <span className="mt-2 flex gap-1 px-1">
                {kinds.map((kind) => (
                  <span key={kind} className={`h-1.5 w-1.5 rounded-full ${kindClass[kind]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-slate-100">{selected}</h3>
        {selectedItems.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nothing on this day.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/80">
            {selectedItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-slate-100">
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full ${kindClass[item.kind]}`} />
                  {kindLabel[item.kind]} · {item.title}
                  <span className="text-slate-400"> · {item.category}</span>
                </span>
                <span className="font-medium text-slate-100">{formatCurrency(item.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Legend({ kind }: { kind: Kind }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${kindClass[kind]}`} />
      {kind === "due" ? "Due" : kind === "done" ? "Paid off" : "Added"}
    </span>
  );
}
