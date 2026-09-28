"use client";

import { formatCurrency } from "@/lib/balance";
import { ITEM_KINDS, type ExpenseItem } from "@/lib/types";

export type ItemDraft = {
  clientId: string;
  savedId?: string;
  name: string;
  kind: string;
  customKind: string;
  quantity: string;
  unitCost: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none ring-teal-400/30 focus:ring-2";

export function emptyItem(): ItemDraft {
  return {
    clientId: crypto.randomUUID(),
    name: "",
    kind: "food",
    customKind: "",
    quantity: "1",
    unitCost: "",
  };
}

export function itemLineTotal(item: ItemDraft): number {
  const quantity = Number(item.quantity);
  const unitCost = Number(item.unitCost);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return 0;
  return Math.round(quantity * unitCost * 100) / 100;
}

export function draftKind(item: ItemDraft): string {
  return item.kind === "custom" ? item.customKind.trim().toLowerCase() : item.kind;
}

export function validateItems(items: ItemDraft[]):
  | {
      ok: true;
      rows: {
        savedId?: string;
        name: string;
        kind: string;
        quantity: number;
        unit_cost: number;
      }[];
    }
  | { ok: false; error: string } {
  const filled = items.filter(
    (item) => item.name.trim() || item.unitCost.trim() || item.customKind.trim(),
  );
  const rows = [];
  for (const item of filled) {
    const name = item.name.trim();
    const kind = draftKind(item);
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);
    if (!name) return { ok: false, error: "Name each thing on the bill." };
    if (!kind) return { ok: false, error: "Pick a type for each thing, or type your own." };
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, error: "Quantity has to be more than zero." };
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      return { ok: false, error: "Enter a cost of zero or more for each thing." };
    }
    rows.push({
      savedId: item.savedId,
      name,
      kind,
      quantity: Math.round(quantity * 100) / 100,
      unit_cost: Math.round(unitCost * 100) / 100,
    });
  }
  return { ok: true, rows };
}

function ItemFields({
  item,
  onChange,
  onRemove,
}: {
  item: ItemDraft;
  onChange: (next: ItemDraft) => void;
  onRemove: () => void;
}) {
  const total = itemLineTotal(item);
  return (
    <div className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 sm:grid-cols-[1.4fr_1fr_0.6fr_0.8fr_auto_auto]">
      <label className="text-xs font-medium text-slate-400">
        What it is
        <input
          value={item.name}
          onChange={(e) => onChange({ ...item, name: e.target.value })}
          placeholder="Milk"
          maxLength={80}
          className={`${inputClass} mt-1`}
        />
      </label>
      <label className="text-xs font-medium text-slate-400">
        Type
        <select
          value={item.kind}
          onChange={(e) => onChange({ ...item, kind: e.target.value })}
          className={`${inputClass} mt-1 capitalize`}
        >
          {ITEM_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind}
            </option>
          ))}
          <option value="custom">something else</option>
        </select>
      </label>
      {item.kind === "custom" ? (
        <label className="text-xs font-medium text-slate-400 sm:col-span-2">
          Your type
          <input
            value={item.customKind}
            onChange={(e) => onChange({ ...item, customKind: e.target.value })}
            placeholder="snacks"
            maxLength={40}
            className={`${inputClass} mt-1`}
          />
        </label>
      ) : null}
      <label className="text-xs font-medium text-slate-400">
        How many
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onChange({ ...item, quantity: e.target.value })}
          className={`${inputClass} mt-1 text-right`}
        />
      </label>
      <label className="text-xs font-medium text-slate-400">
        Cost each
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.unitCost}
          onChange={(e) => onChange({ ...item, unitCost: e.target.value })}
          placeholder="0.00"
          className={`${inputClass} mt-1 text-right`}
        />
      </label>
      <p className="self-end pb-2 text-sm text-slate-300">
        {formatCurrency(total)}
      </p>
      <button
        type="button"
        onClick={onRemove}
        className="self-end pb-1.5 text-sm text-slate-400 hover:text-rose-300"
      >
        Delete
      </button>
    </div>
  );
}

export function BillItemDrafts({
  items,
  onChange,
}: {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
}) {
  const total = items.reduce((sum, item) => sum + itemLineTotal(item), 0);
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">What&apos;s on this bill</h3>
          <p className="mt-1 text-xs text-slate-400">
            For groceries, list each thing: food, drinks, medicine, clothing, furniture, how many, and what each one cost.
          </p>
        </div>
        <p className="text-sm font-medium text-teal-200">Items {formatCurrency(total)}</p>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">No items yet. Add them if you want a breakdown.</p>
        ) : (
          items.map((item) => (
            <ItemFields
              key={item.clientId}
              item={item}
              onChange={(next) =>
                onChange(items.map((row) => (row.clientId === item.clientId ? next : row)))
              }
              onRemove={() => onChange(items.filter((row) => row.clientId !== item.clientId))}
            />
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange([...items, emptyItem()])}
        className="mt-3 text-sm font-medium text-teal-300 hover:text-teal-100"
      >
        Add an item
      </button>
    </section>
  );
}

export function itemsToDrafts(items: ExpenseItem[]): ItemDraft[] {
  return items.map(fromSaved);
}

function fromSaved(item: ExpenseItem): ItemDraft {
  const preset = ITEM_KINDS.includes(item.kind as (typeof ITEM_KINDS)[number]);
  return {
    clientId: item.id,
    savedId: item.id,
    name: item.name,
    kind: preset ? item.kind : "custom",
    customKind: preset ? "" : item.kind,
    quantity: String(item.quantity),
    unitCost: String(item.unit_cost),
  };
}
