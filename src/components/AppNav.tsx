import { Nav } from "@/components/Nav";
import { getActiveHousehold, listMyHouseholds, requireUser } from "@/lib/household";

export async function AppNav() {
  const { user } = await requireUser();
  if (!user) return <Nav />;

  const [households, active] = await Promise.all([
    listMyHouseholds(user.id),
    getActiveHousehold(user.id),
  ]);

  return (
    <Nav
      households={households}
      activeHouseholdId={active.household?.id ?? null}
    />
  );
}
