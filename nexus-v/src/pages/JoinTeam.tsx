import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MemberSlots from "../components/MemberSlots";
import { MAX_MEMBERS, getMe, joinTeam, useTeam } from "../lib/teamStore";

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";

const headingClass =
  "bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-transparent sm:text-5xl";

function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function WarnIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      {children}
    </div>
  );
}

export default function JoinTeam() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const team = useTeam(code);

  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(() => {
    const me = getMe();
    return me && me.code === code ? me.memberId : null;
  });

  const joined = !!team && !!meId && team.members.some((m) => m.id === meId);

  useEffect(() => {
    if (joined && team?.started) navigate("/plan");
  }, [joined, team?.started, navigate]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!code) return;
    if (playerName.trim().length < 2) {
      setError("At least 2 characters.");
      return;
    }
    const result = joinTeam(code, playerName);
    if (!result.ok) {
      setError(
        result.reason === "full"
          ? "Team is full."
          : result.reason === "started"
          ? "Mission already started."
          : "Team not found."
      );
      return;
    }
    setError(null);
    setMeId(result.memberId);
  };

  const isFull = !!team && team.members.length >= MAX_MEMBERS;

  const status = !team
    ? { label: "Invalid link", tone: "rose" as const }
    : joined
    ? { label: "In lobby", tone: "emerald" as const }
    : team.started
    ? { label: "Launched", tone: "amber" as const }
    : isFull
    ? { label: "Crew full", tone: "rose" as const }
    : { label: "Recruiting", tone: "cyan" as const };

  const toneClasses: Record<typeof status.tone, string> = {
    rose: "border-rose-400/20 bg-rose-400/5 text-rose-300",
    emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/5 text-amber-300",
    cyan: "border-cyan-400/20 bg-cyan-400/5 text-cyan-300",
  };
  const dotClasses: Record<typeof status.tone, string> = {
    rose: "bg-rose-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    cyan: "bg-cyan-400",
  };

  /* --------------------------- INVALID LINK ---------------------------- */
  if (!team) {
    return (
      <Shell status={status} toneClasses={toneClasses} dotClasses={dotClasses}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/5 text-rose-300 backdrop-blur-md">
            <WarnIcon className="size-7" />
          </div>
          <h2 className={headingClass} style={{ fontFamily: SERIF }}>
            Team not found.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg" style={{ fontFamily: SERIF }}>
            Ask your captain for a new link.
          </p>
          <Link
            to="/"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 active:scale-[0.98]"
            style={{ fontFamily: SANS }}
          >
            <ChevronLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Home
          </Link>
        </div>
      </Shell>
    );
  }

  /* --------------------------- LOCKED / FULL --------------------------- */
  if (team.started || isFull) {
    const started = team.started;
    return (
      <Shell status={status} toneClasses={toneClasses} dotClasses={dotClasses}>
        <div className="mx-auto max-w-2xl text-center">
          <div
            className={`mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border backdrop-blur-md ${
              started
                ? "border-amber-400/20 bg-amber-400/5 text-amber-300"
                : "border-rose-400/20 bg-rose-400/5 text-rose-300"
            }`}
          >
            {started ? <WarnIcon className="size-7" /> : <LockIcon className="size-7" />}
          </div>
          <h2 className={headingClass} style={{ fontFamily: SERIF }}>
            {started ? "Already launched." : "Crew is full."}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg" style={{ fontFamily: SERIF }}>
            {started ? `${team.name} has already started.` : `${team.name} has ${MAX_MEMBERS} players.`}
          </p>
        </div>
      </Shell>
    );
  }

  const spotsLeft = MAX_MEMBERS - team.members.length;

  /* --------------------- LOBBY + SLIDING BOTTOM CARD ------------------- */
  return (
    <Shell status={status} toneClasses={toneClasses} dotClasses={dotClasses}>
      <div className="pb-28 sm:pb-32">
        <h2 className={headingClass} style={{ fontFamily: SERIF }}>
          {joined ? (
            "You're in."
          ) : (
            <>Join <span className="text-cyan-300">{team.name}</span></>
          )}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-400 sm:text-lg" style={{ fontFamily: SERIF }}>
          {joined
            ? `Waiting for ${team.name} to start.`
            : `${team.members.length} of ${MAX_MEMBERS} spots taken.`}
        </p>

        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md">
          <MemberSlots members={team.members} max={MAX_MEMBERS} meId={meId} />
        </div>
      </div>

      {/* === Sticky bottom card — slides away once joined === */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4 transition-all duration-500 ease-out sm:px-6 sm:pb-6 ${
          joined ? "translate-y-[140%] opacity-0" : "translate-y-0 opacity-100"
        }`}
        aria-hidden={joined}
      >
        <div className="pointer-events-auto w-full max-w-3xl">
          <Glass className="p-4 sm:p-5">
            <form onSubmit={handleSubmit} noValidate style={{ fontFamily: SANS }}>
              <div className="flex items-center gap-3">
                <label htmlFor="player-name" className="sr-only">
                  Your name
                </label>
                <input
                  id="player-name"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    setError(null);
                  }}
                  placeholder={`Join ${team.name}`}
                  maxLength={20}
                  autoComplete="name"
                  autoFocus
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "player-name-error" : undefined}
                  className={`flex-1 rounded-xl border bg-white/[0.03] px-4 py-3.5 text-base text-slate-100 placeholder-slate-500 outline-none transition-all backdrop-blur-xl ${
                    error
                      ? "border-rose-400/60 ring-4 ring-rose-400/10"
                      : "border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-400/10"
                  }`}
                />
                <button
                  type="submit"
                  className="group flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-400 px-5 py-3.5 text-sm font-semibold text-[#070912] shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-200 hover:to-cyan-300 hover:shadow-cyan-400/40 active:scale-[0.98]"
                >
                  Join
                  <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
              <p
                id="player-name-error"
                className="mt-2 min-h-4 text-xs text-rose-300"
                role="alert"
              >
                {error}
              </p>
            </form>
          </Glass>
        </div>
      </div>
    </Shell>
  );
}

/* ----------------------------- Layout shell ----------------------------- */

function Shell({
  children,
  status,
  toneClasses,
  dotClasses,
}: {
  children: React.ReactNode;
  status: { label: string; tone: "rose" | "emerald" | "amber" | "cyan" };
  toneClasses: Record<string, string>;
  dotClasses: Record<string, string>;
}) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#070912] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 size-[40rem] rounded-full bg-indigo-500/25 blur-[140px]" />
        <div className="absolute -bottom-40 -right-24 size-[38rem] rounded-full bg-cyan-400/20 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between px-6 py-5 sm:px-10">
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
            style={{ fontFamily: SANS }}
          >
            <span className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition group-hover:border-white/20 group-hover:bg-white/10">
              <ChevronLeftIcon className="size-3.5" />
            </span>
            Home
          </Link>

          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md ${toneClasses[status.tone]}`}
            style={{ fontFamily: SANS }}
          >
            <span className="relative flex size-1.5">
              <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${dotClasses[status.tone]}`} />
              <span className={`relative inline-flex size-1.5 rounded-full ${dotClasses[status.tone]}`} />
            </span>
            {status.label}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
          <Glass className="w-full max-w-3xl">
            <div className="px-6 py-8 sm:px-10 sm:py-10">{children}</div>
          </Glass>
        </div>
      </div>
    </div>
  );
}