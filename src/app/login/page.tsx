import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { PeopleBackdrop } from "@/components/PeopleBackdrop";
import { LoadingBlock } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <PeopleBackdrop />
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Link
          href="/"
          className="text-lg font-semibold text-teal-100"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          FairShare
        </Link>
      </header>
      <div className="relative z-10 flex flex-1 items-start justify-center px-4 py-10">
        <Suspense fallback={<LoadingBlock label="Loading login…" />}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
