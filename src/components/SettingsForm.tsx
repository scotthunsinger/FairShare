"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ErrorBanner } from "@/components/ui";
import {
  applyTheme,
  PRESET_COLORS,
  type ThemeChoice,
  type ThemeId,
} from "@/lib/theme";

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2";

const presets: { id: Exclude<ThemeId, "custom">; label: string; detail: string }[] = [
  { id: "black", label: "Black", detail: "Dark slate with teal" },
  { id: "white", label: "White", detail: "Light background and dark text" },
  { id: "colorful", label: "Colorful", detail: "Purple, pink, and amber" },
];

export function SettingsForm({
  email,
  displayName,
  role,
  householdName,
  householdId,
  theme,
}: {
  email: string;
  displayName: string | null;
  role: string | null;
  householdName: string | null;
  householdId: string | null;
  theme: ThemeChoice;
}) {
  const router = useRouter();
  const themeSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [accountEmail, setAccountEmail] = useState(email);
  const [name, setName] = useState(displayName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [choice, setChoice] = useState<ThemeChoice>(theme);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [saving, setSaving] = useState("");

  function selectPreset(id: Exclude<ThemeId, "custom">) {
    const preset: ThemeChoice = { id, ...PRESET_COLORS[id] };
    setChoice(preset);
    applyTheme(preset);
    void saveTheme(preset);
  }

  async function saveTheme(next: ThemeChoice) {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ data: { theme: next } });
    if (updateError) setError(updateError.message);
  }

  function updateCustom(patch: Partial<Pick<ThemeChoice, "background" | "text" | "accent">>) {
    const next: ThemeChoice = {
      id: "custom",
      background: patch.background ?? choice.background,
      text: patch.text ?? choice.text,
      accent: patch.accent ?? choice.accent,
    };
    setChoice(next);
    applyTheme(next);
    if (themeSave.current) clearTimeout(themeSave.current);
    themeSave.current = setTimeout(() => {
      void saveTheme(next);
    }, 400);
  }

  async function signOut() {
    setError("");
    setSaving("sign-out");
    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setSaving("");
      setError(signOutError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSaving("account");
    const supabase = createClient();
    const trimmedEmail = accountEmail.trim();
    const trimmedName = name.trim();

    if (trimmedName.length < 1 || trimmedName.length > 40) {
      setSaving("");
      setError("Display name must be 1 to 40 characters.");
      return;
    }

    if (trimmedEmail.toLowerCase() !== email.toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (emailError) {
        setSaving("");
        setError(emailError.message);
        return;
      }
    }

    if (householdId && displayName !== null && trimmedName !== displayName) {
      const { error: nameError } = await supabase.rpc("update_my_display_name", {
        p_display_name: trimmedName,
        p_household_id: householdId,
      });
      if (nameError) {
        setSaving("");
        setError(nameError.message);
        return;
      }
    }

    setSaving("");
    setInfo(
      trimmedEmail.toLowerCase() !== email.toLowerCase()
        ? "Account saved. If your email changed, check that inbox to confirm it."
        : "Account saved.",
    );
    router.refresh();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (currentPassword.length < 6 || newPassword.length < 6) {
      setError("Use a password of at least 6 characters.");
      return;
    }
    setSaving("password");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setSaving("");
      setError(signInError.message);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving("");
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setInfo("Password updated.");
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      {info ? (
        <div className="rounded-lg border border-teal-800 bg-teal-950 px-4 py-3 text-sm text-teal-100">
          {info}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <h2 className="text-sm font-semibold text-slate-100">Your account</h2>
        <dl className="mt-3 space-y-2 text-sm text-slate-300">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-400">Email</dt>
            <dd>{email}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-400">Display name</dt>
            <dd>{displayName ?? "Not in a household yet"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-400">Role</dt>
            <dd className="capitalize">{role ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-400">Household</dt>
            <dd>{householdName ?? "—"}</dd>
          </div>
        </dl>

        <form onSubmit={saveAccount} className="mt-5 space-y-3 border-t border-slate-800 pt-4">
          <label className="block text-sm font-medium text-slate-300">
            Email
            <input
              type="email"
              required
              value={accountEmail}
              onChange={(e) => setAccountEmail(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              disabled={displayName === null}
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={saving === "account"}
            className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
          >
            {saving === "account" ? "Saving…" : "Save account"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <h2 className="text-sm font-semibold text-slate-100">Password</h2>
        <form onSubmit={savePassword} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className={fieldClass}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={saving === "password"}
            className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
          >
            {saving === "password" ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <h2 className="text-sm font-semibold text-slate-100">Color theme</h2>
        <p className="mt-1 text-sm text-slate-400">
          Black, white, colorful, or colors you choose yourself.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset.id)}
              className={`rounded-xl border px-4 py-3 text-left ${
                choice.id === preset.id
                  ? "border-teal-400 bg-teal-950"
                  : "border-slate-700 bg-slate-950 hover:border-slate-500"
              }`}
            >
              <span className="block text-sm font-medium text-slate-100">{preset.label}</span>
              <span className="mt-1 block text-xs text-slate-400">{preset.detail}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => updateCustom({})}
            className={`rounded-xl border px-4 py-3 text-left ${
              choice.id === "custom"
                ? "border-teal-400 bg-teal-950"
                : "border-slate-700 bg-slate-950 hover:border-slate-500"
            }`}
          >
            <span className="block text-sm font-medium text-slate-100">Your own</span>
            <span className="mt-1 block text-xs text-slate-400">Pick background, text, and accent</span>
          </button>
        </div>
        {choice.id === "custom" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ColorField
              label="Background"
              value={choice.background}
              onChange={(background) => updateCustom({ background })}
            />
            <ColorField
              label="Text"
              value={choice.text}
              onChange={(text) => updateCustom({ text })}
            />
            <ColorField
              label="Accent"
              value={choice.accent}
              onChange={(accent) => updateCustom({ accent })}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <h2 className="text-sm font-semibold text-slate-100">Sign out</h2>
        <p className="mt-1 text-sm text-slate-400">Leave FairShare on this browser.</p>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={saving === "sign-out"}
          className="mt-4 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          {saving === "sign-out" ? "Signing out…" : "Sign out"}
        </button>
      </section>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium text-slate-300">
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-slate-600 bg-slate-950"
      />
    </label>
  );
}
