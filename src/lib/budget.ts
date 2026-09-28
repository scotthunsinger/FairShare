import type { ExpenseWithShares } from "@/lib/types";

export type BudgetPeriod = "day" | "week" | "month" | "year";

export type PersonalBill = {
  id: string;
  title: string;
  recorded: string;
  share: number;
};

export function recordDate(iso: string): string {
  return iso.slice(0, 10);
}

export function periodStart(kind: BudgetPeriod, anchorDate: string): string {
  const anchor = anchorDate.slice(0, 10);
  if (kind === "day") return anchor;
  if (kind === "week") return mondayOf(anchor);
  if (kind === "month") return `${anchor.slice(0, 7)}-01`;
  return `${anchor.slice(0, 4)}-01-01`;
}

export function periodEndExclusive(kind: BudgetPeriod, start: string): string {
  const date = utcDate(start.slice(0, 10));
  if (kind === "day") date.setUTCDate(date.getUTCDate() + 1);
  else if (kind === "week") date.setUTCDate(date.getUTCDate() + 7);
  else if (kind === "month") date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCFullYear(date.getUTCFullYear() + 1);
  return formatUTC(date);
}

export function inPeriod(recorded: string, kind: BudgetPeriod, start: string): boolean {
  const normalized = start.slice(0, 10);
  const end = periodEndExclusive(kind, normalized);
  return recorded >= normalized && recorded < end;
}

export function personalSpend(
  expenses: ExpenseWithShares[],
  userId: string,
  kind: BudgetPeriod,
  start: string,
): { total: number; bills: PersonalBill[] } {
  const bills: PersonalBill[] = [];

  for (const expense of expenses) {
    const recorded = recordDate(expense.created_at);
    if (!inPeriod(recorded, kind, start)) continue;
    const share = expense.expense_shares
      .filter((row) => row.user_id === userId)
      .reduce((sum, row) => sum + Number(row.amount_owed), 0);
    if (share <= 0) continue;
    bills.push({
      id: expense.id,
      title: expense.title,
      recorded,
      share: roundMoney(share),
    });
  }

  bills.sort((a, b) => a.recorded.localeCompare(b.recorded) || a.title.localeCompare(b.title));
  const total = roundMoney(bills.reduce((sum, bill) => sum + bill.share, 0));
  return { total, bills };
}

export function budgetLeft(amount: number, spent: number): number {
  return roundMoney(amount - spent);
}

export function formatPeriodRange(kind: BudgetPeriod, start: string): string {
  if (kind === "day") return formatDay(start);
  if (kind === "week") {
    const end = utcDate(periodEndExclusive(kind, start));
    end.setUTCDate(end.getUTCDate() - 1);
    return `${formatDay(start)} – ${formatDay(formatUTC(end))}`;
  }
  if (kind === "month") {
    const [year, month] = start.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }
  return start.slice(0, 4);
}

function mondayOf(key: string): string {
  const date = utcDate(key);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return formatUTC(date);
}

function utcDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
