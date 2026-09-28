"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "@/components/ui";

type AuthMode = "sign-in" | "sign-up" | "change-password";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const changingPassword = useRef(false);

  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (changingPassword.current) return;
      if (event === "SIGNED_IN" && session) {
        router.push(next);
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [next, router]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setInfo("");
    setPassword("");
    setNewPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const trimmedEmail = email.trim();
    if (password.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    if (mode === "change-password" && newPassword.length < 6) {
      setError("The new password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "change-password") {
      changingPassword.current = true;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        changingPassword.current = false;
        setLoading(false);
        setError(signInError.message);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      changingPassword.current = false;
      setLoading(false);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setPassword("");
      setNewPassword("");
      setInfo("Password updated. You are signed in.");
      router.push(next);
      router.refresh();
      return;
    }

    if (mode === "sign-up") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });
      setLoading(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setError(
          "Your account was created, but Supabase is still requiring an email confirmation. In the Supabase dashboard, open Authentication, then Providers, then Email, and turn off Confirm email. Then sign in with this password.",
        );
        setMode("sign-in");
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      setLoading(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }
    }

    router.push(next);
    router.refresh();
  }

  const title =
    mode === "sign-up"
      ? "Create your FairShare account"
      : mode === "change-password"
        ? "Change your password"
        : "Sign in to FairShare";

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950/85 p-6 shadow-lg backdrop-blur-sm">
      <h1 className="text-xl font-semibold text-slate-50">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {mode === "change-password"
          ? "Enter your current password, then choose a new one."
          : "Use your email and a password. No confirmation code."}
      </p>

      <div className="mt-4 space-y-3">
        <ErrorBanner message={error} />
        {info ? (
          <div className="rounded-lg border border-teal-800 bg-teal-950 px-4 py-3 text-sm text-teal-100">
            {info}
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-slate-300">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
            placeholder="you@gmail.com"
          />
        </label>
        <label className="block text-sm font-medium text-slate-300">
          {mode === "change-password" ? "Current password" : "Password"}
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
            placeholder="At least 6 characters"
          />
        </label>
        {mode === "change-password" ? (
          <label className="block text-sm font-medium text-slate-300">
            New password
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
              placeholder="At least 6 characters"
            />
          </label>
        ) : null}
        <button
          type="submit"
          disabled={
            loading ||
            !email.trim() ||
            password.length < 6 ||
            (mode === "change-password" && newPassword.length < 6)
          }
          className="w-full rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : mode === "sign-up"
              ? "Create account"
              : mode === "change-password"
                ? "Update password"
                : "Sign in"}
        </button>
        {mode === "change-password" ? (
          <button
            type="button"
            onClick={() => switchMode("sign-in")}
            className="w-full text-sm text-slate-500 hover:text-slate-100"
          >
            Back to sign in
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => switchMode(mode === "sign-up" ? "sign-in" : "sign-up")}
              className="w-full text-sm text-slate-500 hover:text-slate-100"
            >
              {mode === "sign-up"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
            {mode === "sign-in" ? (
              <button
                type="button"
                onClick={() => switchMode("change-password")}
                className="w-full text-sm text-slate-500 hover:text-slate-100"
              >
                Change password
              </button>
            ) : null}
          </>
        )}
      </form>
    </div>
  );
}
