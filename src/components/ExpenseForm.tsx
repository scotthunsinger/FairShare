"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BillIcon, readImageFile } from "@/components/BillIcon";
import { BillItemDrafts, itemsToDrafts, validateItems, type ItemDraft } from "@/components/BillItems";
import { ErrorBanner } from "@/components/ui";
import { type BillType, type ExpenseWithShares, type HouseholdMember } from "@/lib/types";
import { currentMonth } from "@/lib/balance";

type ItemRow = {
  savedId?: string;
  name: string;
  kind: string;
  quantity: number;
  unit_cost: number;
};

async function syncItems(
  supabase: ReturnType<typeof createClient>,
  expenseId: string,
  rows: ItemRow[],
  fresh: boolean,
): Promise<string | null> {
  if (fresh) {
    if (rows.length === 0) return null;
    const { error } = await supabase.from("expense_items").insert(
      rows.map((row) => ({
        name: row.name,
        kind: row.kind,
        quantity: row.quantity,
        unit_cost: row.unit_cost,
        expense_id: expenseId,
      })),
    );
    return error?.message ?? null;
  }

  const kept = new Set(rows.flatMap((row) => (row.savedId ? [row.savedId] : [])));
  const { data: existingItems, error: listError } = await supabase
    .from("expense_items")
    .select("id")
    .eq("expense_id", expenseId);
  if (listError) return listError.message;

  const removeIds = (existingItems ?? [])
    .map((item) => item.id)
    .filter((id) => !kept.has(id));
  if (removeIds.length > 0) {
    const { error } = await supabase.from("expense_items").delete().in("id", removeIds);
    if (error) return error.message;
  }

  for (const row of rows) {
    const fields = {
      name: row.name,
      kind: row.kind,
      quantity: row.quantity,
      unit_cost: row.unit_cost,
    };
    if (row.savedId) {
      const { error } = await supabase
        .from("expense_items")
        .update(fields)
        .eq("id", row.savedId);
      if (error) return error.message;
    } else {
      const { error } = await supabase
        .from("expense_items")
        .insert({ ...fields, expense_id: expenseId });
      if (error) return error.message;
    }
  }
  return null;
}

type Props = {
  householdId: string;
  members: HouseholdMember[];
  currentUserId: string;
  billTypes: BillType[];
  defaultPercents?: Record<string, number>;
  expense?: ExpenseWithShares;
};

export function ExpenseForm({
  householdId,
  members,
  currentUserId,
  billTypes,
  defaultPercents,
  expense,
}: Props) {
  const router = useRouter();
  const equalShare =
    members.length > 0 ? Math.round((10000 / members.length)) / 100 : 0;

  const initialShares = useMemo(() => {
    const map: Record<string, string> = {};
    if (expense) {
      members.forEach((member) => {
        const share = expense.expense_shares.find((row) => row.user_id === member.user_id);
        map[member.user_id] = String(share ? Number(share.percentage) : 0);
      });
      return map;
    }
    members.forEach((m, index) => {
      if (defaultPercents?.[m.user_id] != null) {
        map[m.user_id] = String(defaultPercents[m.user_id]);
      } else if (index === members.length - 1) {
        const used = members
          .slice(0, -1)
          .reduce((sum, member) => sum + equalShare, 0);
        map[m.user_id] = String(Math.round((100 - used) * 100) / 100);
      } else {
        map[m.user_id] = String(equalShare);
      }
    });
    return map;
  }, [members, equalShare, defaultPercents, expense]);

  const [title, setTitle] = useState(expense?.title ?? "");
  const [types, setTypes] = useState<BillType[]>(billTypes);
  const [category, setCategory] = useState<string>(
    expense?.category ?? billTypes[0]?.name ?? "electricity",
  );
  const [emojiDraft, setEmojiDraft] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("✨");
  const [savingType, setSavingType] = useState(false);
  const [amount, setAmount] = useState(expense ? String(Number(expense.amount)) : "");
  const [dueDate, setDueDate] = useState(expense?.due_date?.slice(0, 10) ?? "");
  const [month, setMonth] = useState(expense?.month?.slice(0, 7) ?? currentMonth());
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? currentUserId);
  const [shares, setShares] = useState<Record<string, string>>(initialShares);
  const [items, setItems] = useState<ItemDraft[]>(() =>
    itemsToDrafts(expense?.expense_items ?? []),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const percentTotal = Object.values(shares).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );
  const percentOk = Math.abs(percentTotal - 100) < 0.01;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!percentOk) {
      setError(`Percentages must add up to 100% (currently ${percentTotal.toFixed(2)}%).`);
      return;
    }

    const itemCheck = validateItems(items);
    if (!itemCheck.ok) {
      setError(itemCheck.error);
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const bill = {
      title: title.trim(),
      category,
      amount: amountNum,
      due_date: dueDate || null,
      month,
      paid_by: paidBy,
    };

    let expenseId = expense?.id;
    if (!expenseId) {
      const { data: created, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          ...bill,
          household_id: householdId,
          created_by: currentUserId,
        })
        .select("id")
        .single();

      if (expenseError || !created) {
        setLoading(false);
        setError(expenseError?.message ?? "Failed to create expense.");
        return;
      }
      expenseId = created.id;
    } else {
      const { error: expenseError } = await supabase
        .from("expenses")
        .update(bill)
        .eq("id", expenseId);
      if (expenseError) {
        setLoading(false);
        setError(expenseError.message);
        return;
      }
    }

    const previouslyPaid = new Map(
      (expense?.expense_shares ?? []).map((share) => [share.user_id, share.is_paid]),
    );
    const payerChanged = expense != null && expense.paid_by !== paidBy;
    const shareRows = members.map((member) => {
      const percentage = Number(shares[member.user_id] || 0);
      const alreadyPaid = previouslyPaid.get(member.user_id);
      return {
        expense_id: expenseId,
        user_id: member.user_id,
        percentage,
        amount_owed: Math.round(((amountNum * percentage) / 100) * 100) / 100,
        is_paid: payerChanged
          ? member.user_id === paidBy || alreadyPaid === true
          : (alreadyPaid ?? member.user_id === paidBy),
      };
    });

    if (!expense) {
      const { error: sharesError } = await supabase.from("expense_shares").insert(shareRows);
      if (sharesError) {
        setLoading(false);
        await supabase.from("expenses").delete().eq("id", expenseId);
        setError(sharesError.message);
        return;
      }
    } else {
      for (const row of shareRows) {
        const { data: updated, error: updateError } = await supabase
          .from("expense_shares")
          .update({
            percentage: row.percentage,
            amount_owed: row.amount_owed,
            is_paid: row.is_paid,
          })
          .eq("expense_id", expenseId)
          .eq("user_id", row.user_id)
          .select("id");
        if (updateError) {
          setLoading(false);
          setError(updateError.message);
          return;
        }
        if (!updated || updated.length === 0) {
          const { error: insertError } = await supabase.from("expense_shares").insert(row);
          if (insertError) {
            setLoading(false);
            setError(insertError.message);
            return;
          }
        }
      }
    }

    if (!expenseId) {
      setLoading(false);
      setError("Failed to save the bill.");
      return;
    }

    const itemError = await syncItems(supabase, expenseId, itemCheck.rows, !expense);
    if (itemError) {
      setLoading(false);
      if (!expense) await supabase.from("expenses").delete().eq("id", expenseId);
      setError(itemError);
      return;
    }

    setLoading(false);

    router.push("/dashboard");
    router.refresh();
  }

  const selectedType = types.find((type) => type.name === category) ?? types[0];
  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2";

  async function saveTypeIcon(
    type: BillType,
    patch: { emoji?: string; image_url?: string | null },
  ) {
    setError("");
    setSavingType(true);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("bill_types")
      .update(patch)
      .eq("id", type.id)
      .select("*")
      .single();
    setSavingType(false);
    if (updateError || !data) {
      setError(updateError?.message ?? "Could not update that bill type.");
      return;
    }
    setTypes((prev) => prev.map((item) => (item.id === type.id ? (data as BillType) : item)));
  }

  async function addBillType() {
    setError("");
    const name = newName.trim().toLowerCase();
    if (!name) {
      setError("Give the new bill type a name.");
      return;
    }
    if (types.some((type) => type.name.toLowerCase() === name)) {
      setCategory(types.find((type) => type.name.toLowerCase() === name)!.name);
      return;
    }
    setSavingType(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("bill_types")
      .insert({
        household_id: householdId,
        name,
        emoji: newEmoji.trim() || "✨",
      })
      .select("*")
      .single();
    setSavingType(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "Could not add that bill type.");
      return;
    }
    const created = data as BillType;
    setTypes((prev) => [...prev, created]);
    setCategory(created.name);
    setNewName("");
    setNewEmoji("✨");
  }

  async function onPicture(type: BillType, file: File | undefined) {
    if (!file) return;
    try {
      const imageUrl = await readImageFile(file);
      await saveTypeIcon(type, { image_url: imageUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not use that picture.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ErrorBanner message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-300 sm:col-span-2">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
            placeholder="March electricity"
          />
        </label>

        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-300">Bill type</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {types.map((type) => {
              const active = type.name === category;
              return (
                <button
                  key={type.id || type.name}
                  type="button"
                  onClick={() => {
                    setCategory(type.name);
                    setEmojiDraft(type.emoji);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-2 py-2 text-left text-sm capitalize ${
                    active
                      ? "border-teal-400 bg-teal-950 text-teal-50"
                      : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  <BillIcon type={type} size="sm" />
                  {type.name}
                </button>
              );
            })}
          </div>
          {selectedType ? (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <BillIcon type={selectedType} size="lg" />
              <label className="text-sm font-medium text-slate-300">
                Emoji
                <input
                  value={emojiDraft || selectedType.emoji}
                  onChange={(e) => setEmojiDraft(e.target.value)}
                  maxLength={8}
                  className="mt-1 w-24 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </label>
              <button
                type="button"
                disabled={savingType}
                onClick={() =>
                  saveTypeIcon(selectedType, {
                    emoji: (emojiDraft || selectedType.emoji).trim() || "📌",
                  })
                }
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
              >
                Save emoji
              </button>
              <label className="text-sm font-medium text-slate-300">
                Picture
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block text-xs text-slate-400"
                  onChange={(e) => onPicture(selectedType, e.target.files?.[0])}
                />
              </label>
              {selectedType.image_url ? (
                <button
                  type="button"
                  onClick={() => saveTypeIcon(selectedType, { image_url: null })}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Remove picture
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="text-sm font-medium text-slate-300">
              New bill type
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addBillType();
                  }
                }}
                placeholder="Rent"
                className="mt-1 block w-40 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <label className="text-sm font-medium text-slate-300">
              Emoji
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addBillType();
                  }
                }}
                maxLength={8}
                className="mt-1 block w-20 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <button
              type="button"
              disabled={savingType}
              onClick={() => void addBillType()}
              className="rounded-lg bg-teal-400 px-3 py-2 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
            >
              Add type
            </button>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-300">
          Amount ($)
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
          />
        </label>

        <label className="block text-sm font-medium text-slate-300">
          Month
          <input
            required
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
          />
        </label>

        <label className="block text-sm font-medium text-slate-300">
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
          />
        </label>

        <label className="block text-sm font-medium text-slate-300 sm:col-span-2">
          Who paid upfront
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <BillItemDrafts items={items} onChange={setItems} />

      <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-100">Share percentages</h3>
          <span
            className={`text-sm font-medium ${
              percentOk ? "text-teal-300" : "text-rose-300"
            }`}
          >
            Total: {percentTotal.toFixed(2)}%
          </span>
        </div>
        <div className="space-y-3">
          {members.map((member) => (
            <label
              key={member.user_id}
              className="flex items-center justify-between gap-3 text-sm text-slate-300"
            >
              <span>{member.display_name}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={shares[member.user_id] ?? "0"}
                  onChange={(e) =>
                    setShares((prev) => ({
                      ...prev,
                      [member.user_id]: e.target.value,
                    }))
                  }
                  className="w-24 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-right text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
                />
                <span className="text-slate-500">%</span>
              </div>
            </label>
          ))}
        </div>
        {!percentOk ? (
          <p className="mt-3 text-xs text-rose-300">
            Percentages must total exactly 100% before saving.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading || !percentOk}
        className="rounded-lg bg-teal-400 px-5 py-2.5 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
      >
        {loading ? "Saving…" : expense ? "Save changes" : "Save expense"}
      </button>
    </form>
  );
}
