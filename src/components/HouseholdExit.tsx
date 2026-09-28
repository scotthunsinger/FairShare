"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteHousehold, leaveHousehold } from "@/lib/household-actions";
import { ErrorBanner } from "@/components/ui";

export function HouseholdExit({
  householdId,
  householdName,
  isOrganizer,
  memberCount,
}: {
  householdId: string;
  householdName: string;
  isOrganizer: boolean;
  memberCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"leave" | "delete" | null>(null);
  const [error, setError] = useState("");

  async function leave() {
    if (isOrganizer && memberCount > 1) {
      setError(
        "You are the organizer. Delete the household if it should be removed for everyone.",
      );
      return;
    }

    const message =
      memberCount === 1
        ? `Leave ${householdName}? You are the only member, so the household will be deleted.`
        : `Leave ${householdName}? You will no longer see its bills.`;
    if (!window.confirm(message)) return;

    setBusy("leave");
    setError("");
    const result = await leaveHousehold(householdId);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function remove() {
    const confirmed = window.confirm(
      `Delete ${householdName}? This removes the household and its bills for everyone.`,
    );
    if (!confirmed) return;

    setBusy("delete");
    setError("");
    const result = await deleteHousehold(householdId);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-rose-900/60 bg-slate-900/80 p-4">
      <h2 className="text-sm font-semibold text-slate-100">Leave or delete</h2>
      <p className="mt-1 text-sm text-slate-500">
        Leaving removes only you. Deleting removes the household and its bills for every member.
      </p>
      <ErrorBanner message={error} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void leave()}
          disabled={busy !== null}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-60"
        >
          {busy === "leave" ? "Leaving…" : "Leave household"}
        </button>
        {isOrganizer ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy !== null}
            className="rounded-lg border border-rose-800 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950 disabled:opacity-60"
          >
            {busy === "delete" ? "Deleting…" : "Delete household"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
