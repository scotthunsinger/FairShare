"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DefaultShare, Household, HouseholdMember } from "@/lib/types";
import { ErrorBanner, EmptyState } from "@/components/ui";

type Props = {
  household: Household;
  members: HouseholdMember[];
  defaults: DefaultShare[];
  isOrganizer: boolean;
  currentUserId: string;
};

export function HouseholdManager({
  household,
  members,
  defaults,
  isOrganizer,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("Equal split");
  const [percents, setPercents] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const equal = members.length
      ? Math.round(10000 / members.length) / 100
      : 0;
    members.forEach((m, i) => {
      map[m.user_id] =
        i === members.length - 1
          ? String(Math.round((100 - equal * (members.length - 1)) * 100) / 100)
          : String(equal);
    });
    return map;
  });
  const [saving, setSaving] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(household.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function removeMember(memberId: string) {
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("household_members")
      .delete()
      .eq("id", memberId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  async function saveDefaults(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const total = Object.values(percents).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0,
    );
    if (Math.abs(total - 100) >= 0.01) {
      setError(`Default percentages must total 100% (currently ${total.toFixed(2)}%).`);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("default_shares")
      .delete()
      .eq("household_id", household.id)
      .eq("label", label.trim());

    const rows = members.map((m) => ({
      household_id: household.id,
      label: label.trim(),
      user_id: m.user_id,
      percentage: Number(percents[m.user_id] || 0),
    }));

    const { error: insertError } = await supabase
      .from("default_shares")
      .insert(rows);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.refresh();
  }

  async function deleteDefaultLabel(defaultLabel: string) {
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("default_shares")
      .delete()
      .eq("household_id", household.id)
      .eq("label", defaultLabel);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  const groupedDefaults = defaults.reduce<Record<string, DefaultShare[]>>(
    (acc, row) => {
      acc[row.label] = acc[row.label] ?? [];
      acc[row.label].push(row);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />

      <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Invite roommates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Share this code. Someone else can enter it under Household to join.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="rounded-lg bg-slate-950 px-3 py-2 font-mono text-lg tracking-widest text-teal-100">
            {household.invite_code}
          </code>
          <button
            type="button"
            onClick={copyCode}
            className="rounded-lg bg-teal-400 px-3 py-2 text-sm font-medium text-on-accent hover:bg-teal-300"
          >
            {copied ? "Copied!" : "Copy code"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Members</h2>
        <ul className="mt-3 divide-y divide-slate-800">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-slate-100">{member.display_name}</p>
                <p className="text-slate-500 capitalize">{member.role}</p>
              </div>
              {isOrganizer && member.user_id !== currentUserId ? (
                <button
                  type="button"
                  onClick={() => removeMember(member.id)}
                  className="text-rose-300 hover:text-rose-200"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Default share presets
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Prefill percentage splits when adding bills
          {isOrganizer ? "." : ". Only organizers can edit presets."}
        </p>

        {Object.keys(groupedDefaults).length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No presets yet" description="Create one below to speed up bill entry." />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {Object.entries(groupedDefaults).map(([defaultLabel, rows]) => (
              <li
                key={defaultLabel}
                className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-100">{defaultLabel}</p>
                  {isOrganizer ? (
                    <button
                      type="button"
                      onClick={() => deleteDefaultLabel(defaultLabel)}
                      className="text-xs text-rose-300 hover:text-rose-200"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {rows.map((row) => (
                    <li key={row.id}>
                      {members.find((m) => m.user_id === row.user_id)?.display_name ??
                        "Member"}
                      : {Number(row.percentage)}%
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        {isOrganizer ? (
          <form onSubmit={saveDefaults} className="mt-5 space-y-3 border-t border-slate-800 pt-4">
            <label className="block text-sm font-medium text-slate-300">
              Preset label
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
                placeholder="Electricity default"
              />
            </label>
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
                    value={percents[member.user_id] ?? "0"}
                    onChange={(e) =>
                      setPercents((prev) => ({
                        ...prev,
                        [member.user_id]: e.target.value,
                      }))
                    }
                    className="w-24 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-right text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
                  />
                  <span>%</span>
                </div>
              </label>
            ))}
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save preset"}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
