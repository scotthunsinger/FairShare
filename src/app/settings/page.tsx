import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { SettingsForm } from "@/components/SettingsForm";
import { PageShell } from "@/components/ui";
import { getActiveHousehold, requireUser } from "@/lib/household";
import { parseTheme } from "@/lib/theme";

export default async function SettingsPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login?next=/settings");

  const { household, membership } = await getActiveHousehold(user.id);
  const theme = parseTheme(user.user_metadata?.theme);

  return (
    <div className="min-h-screen">
      <Nav email={user.email} />
      <PageShell
        title="Settings"
        subtitle="Your account and the colors FairShare uses."
      >
        <SettingsForm
          email={user.email ?? ""}
          displayName={membership?.display_name ?? null}
          role={membership?.role ?? null}
          householdName={household?.name ?? null}
          theme={theme}
        />
      </PageShell>
    </div>
  );
}
