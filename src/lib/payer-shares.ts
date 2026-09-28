import type { ExpenseWithShares } from "@/lib/types";

type ShareTable = {
  from: (table: "expense_shares") => {
    update: (values: { is_paid: true }) => {
      in: (
        column: "id",
        values: string[],
      ) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

/** The person who paid the bill already covered their share, so it stays paid. */
export async function ensurePayerSharesPaid(
  supabase: ShareTable,
  expenses: ExpenseWithShares[],
): Promise<ExpenseWithShares[]> {
  const unpaidPayerShareIds = expenses.flatMap((expense) =>
    expense.expense_shares
      .filter((share) => share.user_id === expense.paid_by && !share.is_paid)
      .map((share) => share.id),
  );
  if (unpaidPayerShareIds.length === 0) return expenses;

  const { error } = await supabase
    .from("expense_shares")
    .update({ is_paid: true })
    .in("id", unpaidPayerShareIds);

  if (error) return expenses;

  const repaired = new Set(unpaidPayerShareIds);
  return expenses.map((expense) => ({
    ...expense,
    expense_shares: expense.expense_shares.map((share) =>
      repaired.has(share.id) ? { ...share, is_paid: true } : share,
    ),
  }));
}
