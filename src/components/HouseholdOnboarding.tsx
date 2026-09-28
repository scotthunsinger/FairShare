"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { selectHousehold } from "@/lib/household-actions";
import { ErrorBanner } from "@/components/ui";

export function HouseholdOnboarding({
  heading = "Get started with a household",
  detail = "Create a household for your roommates, or join one with an invite code.",
}: {
  heading?: string;
  detail?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("create_household", {
      p_name: name.trim(),
      p_display_name: displayName.trim(),
    });
    if (rpcError) {
      setLoading(false);
      setError(rpcError.message);
      return;
    }
    const created = data as { id?: string } | null;
    if (created?.id) await selectHousehold(created.id);
    setLoading(false);
    router.refresh();
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("join_household", {
      p_invite_code: inviteCode.trim(),
      p_display_name: displayName.trim(),
    });
    if (rpcError) {
      setLoading(false);
      setError(rpcError.message);
      return;
    }
    const joined = data as { id?: string } | null;
    if (joined?.id) await selectHousehold(joined.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-700 bg-slate-900/80 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-50">{heading}</h2>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            mode === "create"
              ? "bg-teal-400 text-on-accent"
              : "bg-slate-800 text-slate-200"
          }`}
        >
          Create household
        </button>
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            mode === "join"
              ? "bg-teal-400 text-on-accent"
              : "bg-slate-800 text-slate-200"
          }`}
        >
          Join with code
        </button>
      </div>

      <div className="mt-4">
        <ErrorBanner message={error} />
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <Field
            label="Household name"
            value={name}
            onChange={setName}
            placeholder="Apartment 4B"
            required
          />
          <Field
            label="Your display name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Alex"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create household"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="mt-4 space-y-3">
          <Field
            label="Invite code"
            value={inviteCode}
            onChange={setInviteCode}
            placeholder="ABCD1234"
            required
          />
          <Field
            label="Your display name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Alex"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-teal-300 disabled:opacity-60"
          >
            {loading ? "Joining…" : "Join household"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-teal-400/30 focus:ring-2"
      />
    </label>
  );
}
