import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MemberSlots from "../components/MemberSlots";
import { MAX_MEMBERS, getMe, joinTeam, useTeam } from "../lib/teamStore";

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

export default function JoinTeam() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const team = useTeam(code);

  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [meId, setMeId] = useState<string | null>(() => {
    const me = getMe();
    return me && me.code === code ? me.memberId : null;
  });

  const joined = !!team && !!meId && team.members.some((m) => m.id === meId);

  useEffect(() => {
    if (joined && team?.started) navigate("/plan");
  }, [joined, team?.started, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code || isJoining) return;
    
    if (playerName.trim().length < 2) {
      setError("ERR: MIN 2 CHARS.");
      return;
    }

    setError(null);
    setIsJoining(true);
    try {
      const result = await joinTeam(code, playerName);
      if (!result.ok) {
        setError(result.reason === "full" ? "ERR: CREW FULL." : result.reason === "started" ? "ERR: MISSION STARTED." : "ERR: TEAM NOT FOUND.");
        return;
      }
      setMeId(result.memberId);
    } catch (err) {
      setError("ERR: CONNECTION FAILED.");
    } finally {
      setIsJoining(false);
    }
  };

  const isFull = !!team && team.members.length >= MAX_MEMBERS;

  const status = !team
    ? { label: "INVALID_LINK", tone: "text-rose-400 border-rose-400/50" }
    : joined
    ? { label: "IN_LOBBY", tone: "text-emerald-400 border-emerald-400/50" }
    : team.started
    ? { label: "LAUNCHED", tone: "text-amber-400 border-amber-400/50" }
    : isFull
    ? { label: "CREW_FULL", tone: "text-rose-400 border-rose-400/50" }
    : { label: "RECRUITING", tone: "text-cyan-400 border-cyan-400/50" };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <section className="relative flex h-dvh flex-col overflow-hidden bg-[#05070a] text-slate-100 selection:bg-cyan-400/30" style={{ fontFamily: MONO }}>
      <div 
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)"
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-4 sm:p-8">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 pb-4">
          <button onClick={() => navigate("/")} className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-cyan-300">
            <span className="flex size-8 items-center justify-center border border-white/20 bg-white/5 transition group-hover:border-cyan-400/50">
              <ChevronLeft className="size-4" />
            </span>
            Exit
          </button>

          <div className={`flex items-center gap-2 border px-3 py-1.5 text-xs uppercase tracking-widest bg-white/5 ${status.tone}`}>
            <span className="size-2 animate-pulse bg-current" />
            {status.label}
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="animate-slide-in w-full max-w-2xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </section>
  );

  if (!team) {
    return (
      <Shell>
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-rose-400 sm:text-4xl" style={{ fontFamily: SERIF }}>Connection Lost.</h2>
          <p className="mt-3 text-sm text-slate-400">The invite link is expired or invalid.</p>
        </div>
      </Shell>
    );
  }

  if (team.started || isFull) {
    return (
      <Shell>
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-amber-400 sm:text-4xl" style={{ fontFamily: SERIF }}>
            {team.started ? "Already Launched." : "Crew Full."}
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            {team.started ? `${team.name} is already in flight.` : `${team.name} has no open slots.`}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="pb-32">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl" style={{ fontFamily: SERIF }}>
            Join <span className="text-cyan-300">{team.name}</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">
            {memberCount(team.members.length)}
          </p>
        </div>

        <div className="border border-white/20 bg-black/40 p-6 relative">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-transparent opacity-50" />
          <div className="mb-4 border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Crew_Manifest</span>
          </div>
          <MemberSlots members={team.members} max={MAX_MEMBERS} meId={meId} />
        </div>

        {joined && (
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-cyan-400 uppercase tracking-widest">
            <span className="size-2 animate-ping bg-cyan-400" />
            Awaiting launch command
          </div>
        )}
      </div>

      {/* Sticky Bottom Input */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 transition-all duration-500 ease-out ${
          joined ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="w-full max-w-lg border border-white/20 bg-[#05070a]/90 p-2 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-center bg-black/50 border border-white/20 focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/50 transition-all">
              <input
                value={playerName}
                onChange={(e) => { setPlayerName(e.target.value.toUpperCase()); setError(null); }}
                placeholder="ENTER CALLSIGN..."
                maxLength={20}
                autoComplete="off"
                autoFocus
                disabled={isJoining}
                className="w-full bg-transparent py-4 pl-4 text-lg text-white placeholder-slate-600 outline-none"
              />
              <button
                type="submit"
                disabled={isJoining || playerName.trim().length < 2}
                className="flex h-full items-center justify-center border-l border-white/20 bg-white/5 px-6 py-4 text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-30 disabled:hover:bg-white/5"
              >
                <ChevronRight className={`size-6 ${isJoining ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            <div className="mt-1 px-2 text-xs text-rose-400 font-bold min-h-[1.25rem]">{error}</div>
          </form>
        </div>
      </div>
    </Shell>
  );
}

// Helper for text
function memberCount(c: number) {
  return `[ ${c} / 4 SLOTS OCCUPIED ]`;
}