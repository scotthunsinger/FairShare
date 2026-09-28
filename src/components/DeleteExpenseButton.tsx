"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteExpenseButton({
  expenseId,
  title,
  redirectTo,
}: {
  expenseId: string;
  title: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const confirmed = window.confirm(
      `Delete "${title}"? This removes the bill for everyone in the household.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className="rounded-lg border border-rose-800 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-950 disabled:opacity-60"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </span>
  );
}
