import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PeopleBackdrop } from "@/components/PeopleBackdrop";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <PeopleBackdrop />
      <header className="relative z-10 mx-auto w-full max-w-5xl px-4 py-6">
        <h1
          className="text-4xl font-semibold tracking-tight text-teal-100 sm:text-5xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          FairShare
        </h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-teal-300">
          Roommate utility splitter
        </p>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-20">
        <div className="max-w-xl rounded-3xl border border-white/10 bg-slate-950/75 p-8 shadow-lg backdrop-blur-sm">
          <h2
            className="text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Split the bills. Keep the peace.
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Track utilities, groceries, and dinners, then see who still owes
            at the end of the month.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="rounded-lg bg-teal-500 px-5 py-3 text-sm font-medium text-on-accent hover:bg-teal-400"
            >
              {user ? "Open dashboard" : "Get started"}
            </Link>
            {!user ? (
              <Link
                href="/login"
                className="rounded-lg border border-slate-600 bg-slate-900/80 px-5 py-3 text-sm font-medium text-slate-100 hover:bg-slate-800"
              >
                Log in
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
