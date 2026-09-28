"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { selectHousehold } from "@/lib/household-actions";
import type { HouseholdOption } from "@/lib/household";

export function HouseholdSwitcher({
  households,
  activeId,
}: {
  households: HouseholdOption[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (households.length === 0) return null;

  async function change(householdId: string) {
    if (!householdId || householdId === activeId) return;
    setPending(true);
    await selectHousehold(householdId);
    router.refresh();
    setPending(false);
  }

  return (
    <select
      aria-label="Household"
      value={activeId ?? ""}
      disabled={pending}
      onChange={(event) => void change(event.target.value)}
      className="max-w-36 shrink-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
    >
        {households.map((household) => (
          <option key={household.id} value={household.id}>
            {household.name}
          </option>
        ))}
    </select>
  );
}
