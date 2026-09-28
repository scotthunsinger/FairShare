"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/balance";
import {
  budgetLeft,
  formatPeriodRange,
  periodStart,
  personalSpend,
  type BudgetPeriod,
} from "@/lib/budget";
import type { Budget, ExpenseWithShares } from "@/lib/types";
import { ErrorBanner } from "@/components/ui";

const PERIODS: { id: BudgetPeriod; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

export function BudgetBoard({
  householdId,
  userId,
  expenses,
  budgets,
  today,
}: {
  householdId: string;
  userId: string;
  expenses: ExpenseWithShares[];
  budgets: Budget[];
  today: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<BudgetPeriod>("month");
  const [anchor, setAnchor] = useState(today.slice(0, 7));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const start = periodStart(kind, anchorDate(kind, anchor, today));
  const preview = useMemo(
    () => personalSpend(expenses, userId, kind, start),
    [expenses, userId, kind, start],
  );
  const budgetAmount = Number(amount);
  const hasAmount = Number.isFinite(budgetAmount) && budgetAmount > 0;
  const left = hasAmount ? budgetLeft(budgetAmount, preview.total) : null;

  async function saveBudget(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!hasAmount) {
      setError("Enter a budget greater than zero.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.from("budgets").upsert(
      {
        household_id: householdId,
        user_id: userId,
        period_kind: kind,
        period_start: start,
        amount: Math.round(budgetAmount * 100) / 100,
      },
      { onConflict: "household_id,user_id,period_kind,period_start" },
    );
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.refresh();
  }

  async function removeBudget(budget: Budget) {
    const label = formatPeriodRange(budget.period_kind, budget.period_start);
    if (!window.confirm(`Remove the ${budget.period_kind} budget for ${label}?`)) return;
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("budgets").delete().eq("id", budget.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  function openBudget(budget: Budget) {
    setKind(budget.period_kind);
    setAnchor(anchorFromStart(budget.period_kind, budget.period_start));
    setAmount(String(Number(budget.amount)));
    setError("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveBudget} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((period) => (
            <button
              key={period.id}
              type="button"
              onClick={() => {
                const current = anchorDate(kind, anchor, today);
                const nextAnchor =
                  (period.id === "day" || period.id === "week") &&
                  (kind === "month" || kind === "year")
                    ? today
                    : current;
                setKind(period.id);
                setAnchor(anchorFromStart(period.id, periodStart(period.id, nextAnchor)));
              }}
              className={`rounded-full px-3 py-1.5 text-sm ${
                kind === period.id
                  ? "bg-teal-400 font-medium text-on-accent"
                  : "border border-slate-600 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-300">
            {kind === "week" ? "A day in the week" : kind === "year" ? "Year" : kind === "month" ? "Month" : "Day"}
            <PeriodInput kind={kind} value={anchor} onChange={setAnchor} />
          </label>
          <label className="text-sm font-medium text-slate-300">
            Budget ($)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
            />
          </label>
        </div>

        <ErrorBanner message={error} />

        <Preview
          label={formatPeriodRange(kind, start)}
          spent={preview.total}
          left={left}
          bills={preview.bills}
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save budget"}
        </button>
      </form>

      <section>
        <h2 className="text-sm font-semibold text-slate-100">Saved budgets</h2>
        {budgets.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No budgets saved for this household yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/80">
            {budgets.map((budget) => {
              const spent = personalSpend(
                expenses,
                userId,
                budget.period_kind,
                budget.period_start,
              ).total;
              const remaining = budgetLeft(Number(budget.amount), spent);
              return (
                <li key={budget.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <button type="button" onClick={() => openBudget(budget)} className="text-left">
                    <p className="font-medium capitalize text-slate-100">
                      {budget.period_kind} · {formatPeriodRange(budget.period_kind, budget.period_start)}
                    </p>
                    <p className="text-slate-400">
                      Budget {formatCurrency(Number(budget.amount))} · Your share {formatCurrency(spent)} ·{" "}
                      <LeftText left={remaining} />
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBudget(budget)}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-slate-800"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Preview({
  label,
  spent,
  left,
  bills,
}: {
  label: string;
  spent: number;
  left: number | null;
  bills: { id: string; title: string; recorded: string; share: number }[];
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-sm font-medium text-slate-100">{label}</p>
      <p className="mt-1 text-sm text-slate-400">
        Your share spent {formatCurrency(spent)}
        {left == null ? "" : (
          <>
            {" · "}
            <LeftText left={left} />
          </>
        )}
      </p>
      {bills.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No bills were added in this period.</p>
      ) : (
        <ul className="mt-3 space-y-1 text-xs text-slate-300">
          {bills.map((bill) => (
            <li key={bill.id} className="flex justify-between gap-3">
              <span>
                {bill.title}
                <span className="text-slate-500"> · added {bill.recorded}</span>
              </span>
              <span>{formatCurrency(bill.share)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LeftText({ left }: { left: number }) {
  if (left < 0) {
    return <span className="text-rose-300">Over by {formatCurrency(-left)}</span>;
  }
  return <span className="text-teal-200">Left {formatCurrency(left)}</span>;
}

function PeriodInput({
  kind,
  value,
  onChange,
}: {
  kind: BudgetPeriod;
  value: string;
  onChange: (value: string) => void;
}) {
  const className =
    "mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2";
  if (kind === "year") {
    return (
      <input
        required
        type="number"
        min={2000}
        max={2100}
        value={value.slice(0, 4)}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
    );
  }
  if (kind === "month") {
    return (
      <input
        required
        type="month"
        value={value.slice(0, 7)}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
    );
  }
  return (
    <input
      required
      type="date"
      value={value.slice(0, 10)}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    />
  );
}

function anchorDate(kind: BudgetPeriod, anchor: string, today: string): string {
  if (kind === "year") return `${anchor.slice(0, 4) || today.slice(0, 4)}-01-01`;
  if (kind === "month") return `${(anchor.slice(0, 7) || today.slice(0, 7))}-01`;
  return anchor.length >= 10 ? anchor.slice(0, 10) : today;
}

function anchorFromStart(kind: BudgetPeriod, start: string): string {
  if (kind === "year") return start.slice(0, 4);
  if (kind === "month") return start.slice(0, 7);
  return start.slice(0, 10);
}
