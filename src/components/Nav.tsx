"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HouseholdSwitcher } from "@/components/HouseholdSwitcher";
import type { HouseholdOption } from "@/lib/household";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/expenses/new", label: "Add Bill" },
  { href: "/balance", label: "Balance" },
  { href: "/budget", label: "Budget" },
  { href: "/household", label: "Household" },
  { href: "/settings", label: "Settings" },
];

export function Nav({
  households = [],
  activeHouseholdId = null,
}: {
  households?: HouseholdOption[];
  activeHouseholdId?: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          href="/dashboard"
          className="shrink-0 text-2xl font-bold tracking-tight text-teal-200"
        >
          FairShare
        </Link>
        <nav className="flex min-w-0 flex-1 flex-nowrap items-center justify-end gap-1 overflow-x-auto">
          <HouseholdSwitcher households={households} activeId={activeHouseholdId} />
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-md px-2 py-1.5 text-sm transition ${
                  active
                    ? "bg-teal-950 font-medium text-teal-100"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
