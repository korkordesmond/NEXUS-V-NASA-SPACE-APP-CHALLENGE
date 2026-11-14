import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import MemberSlots from "../components/MemberSlots";
import { MAX_MEMBERS, createTeam, startTeam, useTeam } from "../lib/teamStore";
const apiURL = import.meta.env.VITE_API_URL;
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

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
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

export default function CreateTeam() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const team = useTeam(teamCode ?? undefined);

  const inviteLink = teamCode ? `${apiURL}/join/${teamCode}` : "";
  const captainId = team?.members.find((m) => m.isCaptain)?.id ?? null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length < 3) {
      setError("At least 3 characters.");
      return;
    }
    setError(null);
    const created = createTeam(teamName);
    setTeamCode(created.code);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleStart = () => {
    if (!teamCode) return;
    startTeam(teamCode);
    navigate("/plan");
  };

  const created = teamCode !== null;
  const memberCount = team?.members.length ?? 1;

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
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between px-6 py-5 sm:px-10">
          <Link
            to="/"
            className="group flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
            style={{ fontFamily: SANS }}
          >
            <span className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition group-hover:border-white/20 group-hover:bg-white/10">
              <ChevronLeftIcon className="size-3.5" />
            </span>
            Back
          </Link>

          <div
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md"
            style={{ fontFamily: SANS }}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-cyan-400" />
            </span>
            {created ? "Lobby live" : "New team"}
          </div>
        </div>

        {/* Content */}
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-6">
          <Glass className="w-full max-w-5xl">
            <div className="px-6 py-10 sm:px-12 sm:py-14">
              {!created ? (
                <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-2xl">
                  <h2 className={headingClass} style={{ fontFamily: SERIF }}>
                    Name your team.
                  </h2>
                  <p
                    className="mt-3 text-base leading-relaxed text-slate-400 sm:text-lg"
                    style={{ fontFamily: SERIF }}
                  >
                    Invite up to {MAX_MEMBERS - 1} teammates with a link.
                  </p>

                  <div className="relative mt-8" style={{ fontFamily: SANS }}>
                    <label
                      htmlFor="team-name"
                      className="mb-2 block text-xs font-medium tracking-wide text-slate-500"
                    >
                      Team name
                    </label>
                    <div className="relative">
                      <input
                        id="team-name"
                        value={teamName}
                        onChange={(e) => {
                          setTeamName(e.target.value);
                          setError(null);
                        }}
                        placeholder="Nexus Vipers"
                        autoComplete="off"
                        autoFocus
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? "team-name-error" : undefined}
                        className={`w-full rounded-2xl border bg-white/[0.03] py-4 pl-5 pr-16 text-lg text-slate-100 placeholder-slate-600 outline-none transition-all backdrop-blur-xl ${
                          error
                            ? "border-rose-400/60 ring-4 ring-rose-400/10"
                            : "border-white/10 focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-4 focus:ring-cyan-400/10"
                        }`}
                      />
                      <button
                        type="submit"
                        aria-label="Create team"
                        className="group absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-400 text-[#070912] shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-200 hover:to-cyan-300 hover:shadow-cyan-400/40 active:scale-95"
                      >
                        <ChevronRightIcon className="size-5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                    <p id="team-name-error" className="mt-2.5 min-h-5 text-sm text-rose-300" role="alert">
                      {error}
                    </p>
                  </div>
                </form>
              ) : (
                <div>
                  <div
                    className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs font-medium text-emerald-300"
                    style={{ fontFamily: SANS }}
                  >
                    <CheckIcon className="size-3" />
                    Team created
                  </div>

                  <h2 className={headingClass} style={{ fontFamily: SERIF }}>
                    {team?.name ?? teamName.trim()} is ready.
                  </h2>
                  <p
                    className="mt-2 text-base leading-relaxed text-slate-400 sm:text-lg"
                    style={{ fontFamily: SERIF }}
                  >
                    Share the link to invite teammates.
                  </p>

                  <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
                    <div className="flex flex-col" style={{ fontFamily: SANS }}>
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium tracking-wide text-cyan-300">
                            Invite link
                          </span>
                          <span className="text-xs text-slate-500">
                            {memberCount}/{MAX_MEMBERS} joined
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            readOnly
                            value={inviteLink}
                            onFocus={(e) => e.currentTarget.select()}
                            aria-label="Team invite link"
                            className="w-full truncate rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-4 pr-24 text-sm text-slate-300 outline-none transition focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/10"
                          />
                          <button
                            type="button"
                            onClick={copyLink}
                            className={`absolute right-1.5 top-1/2 flex h-9 -translate-y-1/2 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all active:scale-95 ${
                              copied
                                ? "bg-emerald-400/20 text-emerald-300"
                                : "bg-white/10 text-slate-100 hover:bg-white/20"
                            }`}
                          >
                            {copied ? (
                              <>
                                <CheckIcon className="size-3.5" />
                                Copied
                              </>
                            ) : (
                              <>
                                <CopyIcon className="size-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="mt-4 text-sm text-slate-500">
                        {memberCount >= MAX_MEMBERS
                          ? "Crew is full."
                          : memberCount === 1
                          ? "No one has joined yet."
                          : "You can start without a full crew."}
                      </p>

                      <button
                        type="button"
                        onClick={handleStart}
                        className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-400 px-6 py-3.5 text-sm font-semibold text-[#070912] shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-200 hover:to-cyan-300 hover:shadow-cyan-400/40 active:scale-[0.98]"
                      >
                        {memberCount === 1 ? "Start solo" : "Start"}
                        <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md">
                      <MemberSlots members={team?.members ?? []} max={MAX_MEMBERS} meId={captainId} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}