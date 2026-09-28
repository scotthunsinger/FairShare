export function PeopleBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <img
        src="/agreeing-roommates.png"
        alt=""
        className="h-full w-full object-cover opacity-45 saturate-50"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/70 to-[#0b1220]" />
    </div>
  );
}
