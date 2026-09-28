export type HouseholdRole = "organizer" | "member";

export type Household = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  role: HouseholdRole;
  joined_at: string;
};

export type Expense = {
  id: string;
  household_id: string;
  title: string;
  category: string;
  amount: number;
  due_date: string | null;
  month: string;
  paid_by: string;
  created_by: string;
  is_settled: boolean;
  created_at: string;
};

export type ExpenseShare = {
  id: string;
  expense_id: string;
  user_id: string;
  percentage: number;
  amount_owed: number;
  is_paid: boolean;
};

export type DefaultShare = {
  id: string;
  household_id: string;
  label: string;
  user_id: string;
  percentage: number;
};

export type ExpenseItem = {
  id: string;
  expense_id: string;
  name: string;
  kind: string;
  quantity: number;
  unit_cost: number;
};

export const ITEM_KINDS = [
  "food",
  "drinks",
  "medicine",
  "clothing",
  "furniture",
  "other",
] as const;

export type ExpenseWithShares = Expense & {
  expense_shares: ExpenseShare[];
  expense_items?: ExpenseItem[];
};

export type BillType = {
  id: string;
  household_id: string;
  name: string;
  emoji: string;
  image_url: string | null;
  created_at?: string;
};

export const DEFAULT_BILL_TYPES: { name: string; emoji: string }[] = [
  { name: "electricity", emoji: "⚡" },
  { name: "water", emoji: "💧" },
  { name: "gas", emoji: "🔥" },
  { name: "internet", emoji: "📶" },
  { name: "groceries", emoji: "🛒" },
  { name: "dinner", emoji: "🍽️" },
  { name: "trip", emoji: "🧳" },
  { name: "other", emoji: "📌" },
];

export function findBillType(types: BillType[], category: string): BillType {
  const match = types.find(
    (type) => type.name.toLowerCase() === category.toLowerCase(),
  );
  if (match) return match;
  const fallback = DEFAULT_BILL_TYPES.find(
    (type) => type.name === category.toLowerCase(),
  );
  return {
    id: "",
    household_id: "",
    name: category,
    emoji: fallback?.emoji ?? "📌",
    image_url: null,
  };
}
