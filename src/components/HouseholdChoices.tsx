"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { selectHousehold } from "@/lib/household-actions";
import type { HouseholdOption } from "@/lib/household";

export function HouseholdChoices({
  households,
  activeId,
}: {
  households: HouseholdOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function choose(householdId: string) {
    if (householdId === activeId || pendingId) return;
    setPendingId(householdId);
    await selectHousehold(householdId);
    router.refresh();
    setPendingId(null);
  }

  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {households.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => void choose(item.id)}
              disabled={pendingId !== null}
              className={`rounded-full border px-3 py-1 text-sm disabled:opacity-60 ${
                active
                  ? "border-teal-500 bg-teal-950 text-teal-100"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
              }`}
            >
              {item.name}
              <span className="ml-1 text-slate-400">· {item.role}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
