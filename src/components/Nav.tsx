"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/expenses/new", label: "Add Bill" },
  { href: "/balance", label: "Balance" },
  { href: "/household", label: "Household" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-teal-200">
            FairShare
          </Link>
          {email ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-sm text-slate-400 hover:text-slate-100 sm:hidden"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          ) : null}
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-teal-950 font-medium text-teal-100"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {email ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="ml-2 hidden rounded-md px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100 sm:inline-flex"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
