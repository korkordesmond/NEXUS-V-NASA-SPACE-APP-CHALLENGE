import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import MemberSlots from "../components/MemberSlots";
import { MAX_MEMBERS, createTeam, startTeam, useTeam } from "../lib/teamStore";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';

function ChevronLeft({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function CreateTeam() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const team = useTeam(teamCode ?? undefined);
  const inviteLink = teamCode ? `${window.location.origin}/join/${teamCode}` : "";
  const captainId = team?.members.find((m) => m.isCaptain)?.id ?? null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (teamName.trim().length < 3) {
      setError("ERR: AT LEAST 3 CHARACTERS.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createTeam(teamName);
      setTeamCode(created.code);
    } catch (err) {
      setError("ERR: SERVER CONNECTION FAILED.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch { /* ignore */ }
  };

  const handleStart = async () => {
    if (!teamCode) return;
    await startTeam(teamCode);
    navigate("/plan");
  };

  const created = teamCode !== null;
  const memberCount = team?.members.length ?? 1;

  return (
    <section className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#05070a] text-slate-100 selection:bg-cyan-400/30" style={{ fontFamily: MONO }}>
      {/* Pixel Grid Background */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)"
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-8">
        
        {/* Top Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-4">
          <button onClick={() => navigate("/")} className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-cyan-300">
            <span className="flex size-8 items-center justify-center border border-white/20 bg-white/5 transition group-hover:border-cyan-400/50">
              <ChevronLeft className="size-4" />
            </span>
            Exit
          </button>

          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap border border-white/20 bg-white/5 px-2 py-1.5 text-[10px] uppercase tracking-widest text-slate-300 sm:px-3 sm:text-xs">
            <span className="size-2 animate-pulse bg-cyan-400" />
            {created ? "Lobby.Live" : "Setup.Init"}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col justify-center py-6 sm:py-8">
          
          {!created ? (
            <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-lg animate-slide-in">
              
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-500">Step 01 / 02</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl" style={{ fontFamily: SERIF }}>
                  Designate Team.
                </h1>
              </div>

              <div className="relative group">
                {/* Decorative corner brackets */}
                <div className="absolute -left-1 -top-1 size-3 border-l-2 border-t-2 border-cyan-400/50" />
                <div className="absolute -right-1 -top-1 size-3 border-r-2 border-t-2 border-cyan-400/50" />
                <div className="absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-cyan-400/50" />
                <div className="absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-cyan-400/50" />
                
                <div className="flex items-center bg-black/50 border border-white/20 focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/50 transition-all">
                  <input
                    value={teamName}
                    onChange={(e) => { setTeamName(e.target.value.toUpperCase()); setError(null); }}
                    placeholder="ENTER CALLSIGN..."
                    maxLength={20}
                    autoFocus
                    disabled={isSubmitting}
                    className="min-w-0 flex-1 bg-transparent py-4 pl-4 text-base text-white placeholder-slate-600 outline-none sm:text-lg"
                  />
                  {/* Chevron Navigation Only */}
                  <button
                    type="submit"
                    disabled={isSubmitting || teamName.trim().length < 3}
                    className="flex shrink-0 items-center justify-center self-stretch border-l border-white/20 bg-white/5 px-4 py-4 text-cyan-300 sm:px-6 transition hover:bg-cyan-400/20 disabled:opacity-30 disabled:hover:bg-white/5"
                  >
                    <ChevronRight className={`size-6 ${isSubmitting ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
              
              <div className="mt-3 flex justify-between px-1 text-xs text-rose-400 font-bold">
                <span>{error}</span>
                <span className="text-slate-600">{teamName.length}/20</span>
              </div>
            </form>
          ) : (
            <div className="mx-auto w-full max-w-4xl animate-slide-in">
              
              <div className="mb-8 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-500">Step 02 / 02</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl" style={{ fontFamily: SERIF }}>
                  <span className="break-words">{team?.name ?? teamName}</span>
                </h1>
              </div>

              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                
                {/* Invite Panel */}
                <div className="border border-white/20 bg-black/40 p-4 sm:p-6 relative">
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-transparent opacity-50" />
                  
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">Invite_Link</span>
                    <span className="text-xs text-slate-400">{memberCount} / {MAX_MEMBERS} SLOTS</span>
                  </div>
                  
                  <div className="flex items-center border border-white/20 bg-black/60">
                    <input
                      readOnly
                      value={inviteLink}
                      onClick={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 truncate bg-transparent py-3 pl-3 text-sm text-slate-300 outline-none"
                    />
                    <button
                      onClick={copyLink}
                      className="flex shrink-0 items-center self-stretch border-l border-white/20 bg-white/5 px-4 text-xs font-bold uppercase text-white hover:bg-cyan-400/20 hover:text-cyan-300"
                    >
                      Copy
                    </button>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    {memberCount >= MAX_MEMBERS ? "> CREW AT MAX CAPACITY." : memberCount === 1 ? "> AWAITING INCOMING SIGNALS." : `> ${MAX_MEMBERS - memberCount} SLOTS REMAINING.`}
                  </p>

                  {/* Chevron Navigation for Starting */}
                  <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-xs uppercase text-slate-400">Ready to deploy?</span>
                    <button
                      onClick={handleStart}
                      className="flex size-12 items-center justify-center border border-cyan-400/50 bg-cyan-400/10 text-cyan-300 transition hover:bg-cyan-400/30 active:scale-95"
                    >
                      <ChevronRight className="size-6" />
                    </button>
                  </div>
                </div>

                {/* Members Panel */}
                <div className="border border-white/20 bg-black/40 p-4 sm:p-6 relative">
                   <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-transparent opacity-50" />
                   <div className="mb-4 border-b border-white/10 pb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Crew_Manifest</span>
                  </div>
                  <MemberSlots members={team?.members ?? []} max={MAX_MEMBERS} meId={captainId} />
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}