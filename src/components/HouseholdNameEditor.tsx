"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function HouseholdNameEditor({
  householdId,
  name,
}: {
  householdId: string;
  name: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError("Use 1 to 40 characters.");
      return;
    }

    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("households")
      .update({ name: trimmed })
      .eq("id", householdId)
      .select("id");
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError("Only the organizer can rename this household.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setError("");
          setEditing(true);
        }}
        className="mt-1 text-xs font-medium text-teal-300 hover:text-teal-100"
      >
        Edit
      </button>
    );
  }

  return (
    <form onSubmit={save} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={40}
        required
        aria-label="Household name"
        className="w-56 rounded-lg border border-slate-600 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setError("");
        }}
        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
      >
        Cancel
      </button>
      {error ? <p className="w-full text-xs text-rose-300">{error}</p> : null}
    </form>
  );
}
