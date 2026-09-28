import type { ExpenseWithShares, HouseholdMember } from "@/lib/types";

export type DebtEdge = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function currentMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function memberName(
  members: HouseholdMember[],
  userId: string,
): string {
  return members.find((m) => m.user_id === userId)?.display_name ?? "Unknown";
}

/**
 * For each expense, every member other than paid_by owes paid_by their amount_owed.
 * Aggregate pairwise nets (A→B minus B→A).
 */
export function buildBalanceMatrix(
  expenses: ExpenseWithShares[],
  unpaidOnly = false,
): DebtEdge[] {
  const pairwise = new Map<string, number>();

  for (const expense of expenses) {
    for (const share of expense.expense_shares) {
      if (share.user_id === expense.paid_by) continue;
      if (unpaidOnly && share.is_paid) continue;
      if (share.amount_owed <= 0) continue;

      const key = `${share.user_id}|${expense.paid_by}`;
      pairwise.set(key, (pairwise.get(key) ?? 0) + Number(share.amount_owed));
    }
  }

  const seen = new Set<string>();
  const edges: DebtEdge[] = [];

  for (const [key, amount] of pairwise.entries()) {
    if (seen.has(key)) continue;
    const [from, to] = key.split("|");
    const reverseKey = `${to}|${from}`;
    const reverse = pairwise.get(reverseKey) ?? 0;
    seen.add(key);
    seen.add(reverseKey);

    const net = amount - reverse;
    if (Math.abs(net) < 0.005) continue;

    if (net > 0) {
      edges.push({ fromUserId: from, toUserId: to, amount: roundMoney(net) });
    } else {
      edges.push({
        fromUserId: to,
        toUserId: from,
        amount: roundMoney(-net),
      });
    }
  }

  return edges.sort((a, b) => b.amount - a.amount);
}

export function totalsByUser(
  expenses: ExpenseWithShares[],
): Map<string, { responsibility: number; unpaid: number; paidUpfront: number }> {
  const totals = new Map<
    string,
    { responsibility: number; unpaid: number; paidUpfront: number }
  >();

  const ensure = (userId: string) => {
    if (!totals.has(userId)) {
      totals.set(userId, { responsibility: 0, unpaid: 0, paidUpfront: 0 });
    }
    return totals.get(userId)!;
  };

  for (const expense of expenses) {
    ensure(expense.paid_by).paidUpfront += Number(expense.amount);
    for (const share of expense.expense_shares) {
      const row = ensure(share.user_id);
      row.responsibility += Number(share.amount_owed);
      if (!share.is_paid) {
        row.unpaid += Number(share.amount_owed);
      }
    }
  }

  return totals;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
