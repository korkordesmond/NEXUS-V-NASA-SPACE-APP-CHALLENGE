import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import MemberSlots from "../components/MemberSlots";
import { MAX_MEMBERS, createTeam, startTeam, useTeam } from "../lib/teamStore";

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";

const headingClass =
  "bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-transparent sm:text-5xl";

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
      className={`relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.03] shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-3xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const team = useTeam(teamCode ?? undefined);
  const inviteLink = teamCode ? `${window.location.origin}/join/${teamCode}` : "";
  const captainId = team?.members.find((m) => m.isCaptain)?.id ?? null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length < 3) {
      setError("At least 3 characters required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    
    try {
      const created = await createTeam(teamName);
      setTeamCode(created.code);
    } catch (err) {
      setError("Failed to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  const handleStart = async () => {
    if (!teamCode) return;
    await startTeam(teamCode);
    navigate("/plan");
  };

  const created = teamCode !== null;
  const memberCount = team?.members.length ?? 1;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#070912] text-slate-100 selection:bg-cyan-400/30">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 size-[40rem] rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute -bottom-40 -right-24 size-[38rem] rounded-full bg-cyan-400/15 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between px-6 py-6 sm:px-10">
          <Link
            to="/"
            className="group flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
            style={{ fontFamily: SANS }}
          >
            <span className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition group-hover:border-white/20 group-hover:bg-white/10">
              <ChevronLeftIcon className="size-4" />
            </span>
            Home
          </Link>

          <div
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 backdrop-blur-md"
            style={{ fontFamily: SANS }}
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
            </span>
            {created ? "Lobby live" : "New team"}
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <Glass className="w-full max-w-5xl">
            <div className="px-6 py-12 sm:px-12 sm:py-16">
              {!created ? (
                <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-xl animate-slide-in">
                  {/* Progress Indicator */}
                  <div className="mb-8 flex items-center gap-3 text-xs font-medium tracking-wider text-slate-500" style={{ fontFamily: SANS }}>
                    <span className="flex items-center gap-1.5 text-cyan-300">
                      <span className="flex size-5 items-center justify-center rounded-full bg-cyan-400/20 text-[10px] text-cyan-300">1</span>
                      Setup
                    </span>
                    <div className="h-px w-8 bg-white/10" />
                    <span className="flex items-center gap-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px]">2</span>
                      Invite
                    </span>
                  </div>

                  <h2 className={headingClass} style={{ fontFamily: SERIF }}>
                    Name your team.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg" style={{ fontFamily: SERIF }}>
                    Give your crew a callsign. You can invite up to {MAX_MEMBERS - 1} teammates once created.
                  </p>

                  <div className="mt-10" style={{ fontFamily: SANS }}>
                    <label htmlFor="team-name" className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Team Name
                    </label>
                    <div className="relative group">
                      <input
                        id="team-name"
                        value={teamName}
                        onChange={(e) => { setTeamName(e.target.value); setError(null); }}
                        placeholder="e.g. Nexus Vipers"
                        autoComplete="off"
                        autoFocus
                        disabled={isSubmitting}
                        className={`w-full rounded-2xl border bg-white/[0.02] py-4 pl-5 pr-20 text-lg text-slate-100 placeholder-slate-600 outline-none transition-all duration-300 backdrop-blur-xl ${
                          error
                            ? "border-rose-400/60 ring-4 ring-rose-400/10"
                            : "border-white/10 hover:border-white/20 focus:border-cyan-400/50 focus:bg-white/[0.04] focus:ring-4 focus:ring-cyan-400/10"
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || teamName.trim().length < 3}
                        aria-label="Create team"
                        className="absolute right-2.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-400 text-[#070912] shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-200 hover:to-cyan-300 hover:shadow-cyan-400/40 active:scale-95 disabled:opacity-40 disabled:shadow-none"
                      >
                        <ChevronRightIcon className={`size-5 transition-transform group-hover:translate-x-0.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between px-1">
                      <p className="text-xs text-rose-300" role="alert">{error}</p>
                      <p className="text-xs text-slate-500">{teamName.length}/24</p>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="animate-slide-in">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300" style={{ fontFamily: SANS }}>
                    <CheckIcon className="size-3.5" />
                    Team created
                  </div>

                  <h2 className={headingClass} style={{ fontFamily: SERIF }}>
                    {team?.name ?? teamName.trim()}
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-400 sm:text-lg" style={{ fontFamily: SERIF }}>
                    Share the link below to invite your crew to the lobby.
                  </p>

                  <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:gap-8">
                    
                    {/* Left Column: Invite & Start */}
                    <div className="flex flex-col gap-5" style={{ fontFamily: SANS }}>
                      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Invite Link</span>
                          <span className="rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-slate-300">
                            {memberCount} / {MAX_MEMBERS} Joined
                          </span>
                        </div>

                        <div className="relative flex items-center">
                          <input
                            readOnly
                            value={inviteLink}
                            onFocus={(e) => e.currentTarget.select()}
                            aria-label="Team invite link"
                            className="w-full truncate rounded-xl border border-white/10 bg-[#070912]/50 py-3.5 pl-4 pr-28 text-sm font-medium text-slate-300 outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
                          />
                          <button
                            type="button"
                            onClick={copyLink}
                            className={`absolute right-1.5 flex h-10 items-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-all active:scale-95 ${
                              copied
                                ? "bg-emerald-400/20 text-emerald-300"
                                : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                          >
                            {copied ? <><CheckIcon className="size-4" /> Copied</> : <><CopyIcon className="size-4" /> Copy</>}
                          </button>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-col gap-3">
                        <p className="text-sm text-slate-500">
                          {memberCount >= MAX_MEMBERS
                            ? "Crew is full. Ready to launch."
                            : memberCount === 1
                            ? "Waiting for teammates to join..."
                            : `${MAX_MEMBERS - memberCount} spot(s) remaining.`}
                        </p>

                        <button
                          type="button"
                          onClick={handleStart}
                          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-400 px-6 py-4 text-sm font-bold text-[#070912] shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-200 hover:to-cyan-300 hover:shadow-cyan-400/40 active:scale-[0.98]"
                        >
                          {memberCount === 1 ? "Start Solo Mission" : "Launch Mission"}
                          <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Member Slots */}
                    <div className="relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400" style={{ fontFamily: SANS }}>
                          Crew Manifest
                        </span>
                      </div>
                      <div className="flex-1">
                        <MemberSlots members={team?.members ?? []} max={MAX_MEMBERS} meId={captainId} />
                      </div>
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