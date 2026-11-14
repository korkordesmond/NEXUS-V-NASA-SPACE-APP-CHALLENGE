import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
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

/* Defined at module level so it keeps a stable identity between renders.
   (Declared inside JoinTeam it was a new component type on every keystroke,
   which remounted the page and dropped input focus.) */
function Shell({
  children,
  status,
  onExit,
}: {
  children: ReactNode;
  status: { label: string; tone: string };
  onExit: () => void;
}) {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#05070a] text-slate-100 selection:bg-cyan-400/30" style={{ fontFamily: MONO }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-8">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-4">
          <button onClick={onExit} className="group flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-cyan-300">
            <span className="flex size-8 items-center justify-center border border-white/20 bg-white/5 transition group-hover:border-cyan-400/50">
              <ChevronLeft className="size-4" />
            </span>
            Exit
          </button>

          <div className={`flex shrink-0 items-center gap-2 whitespace-nowrap border bg-white/5 px-2 py-1.5 text-[10px] uppercase tracking-widest sm:px-3 sm:text-xs ${status.tone}`}>
            <span className="size-2 animate-pulse bg-current" />
            {status.label}
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center py-6 sm:py-8">
          <div className="animate-slide-in mx-auto w-full max-w-2xl">{children}</div>
        </div>
      </div>
    </section>
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

  const exit = () => navigate("/");

  if (!team) {
    return (
      <Shell status={status} onExit={exit}>
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-rose-400 sm:text-4xl" style={{ fontFamily: SERIF }}>Connection Lost.</h2>
          <p className="mt-3 text-sm text-slate-400">The invite link is expired or invalid.</p>
        </div>
      </Shell>
    );
  }

  if (team.started || isFull) {
    return (
      <Shell status={status} onExit={exit}>
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-amber-400 sm:text-4xl" style={{ fontFamily: SERIF }}>
            {team.started ? "Already Launched." : "Crew Full."}
          </h2>
          <p className="mt-3 break-words text-sm text-slate-400">
            {team.started ? `${team.name} is already in flight.` : `${team.name} has no open slots.`}
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell status={status} onExit={exit}>
      {/* Extra bottom padding keeps the manifest clear of the fixed input bar */}
      <div className="pb-40">
        <div className="mb-6 text-center">
          <h1 className="break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl" style={{ fontFamily: SERIF }}>
            Join <span className="text-cyan-300">{team.name}</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-slate-400">
            {memberCount(team.members.length)}
          </p>
        </div>

        <div className="relative border border-white/20 bg-black/40 p-4 sm:p-6">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-cyan-400 to-transparent opacity-50" />
          <div className="mb-4 border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Crew_Manifest</span>
          </div>
          <MemberSlots members={team.members} max={MAX_MEMBERS} meId={meId} />
        </div>

        {joined && (
          <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs uppercase tracking-widest text-cyan-400">
            <span className="size-2 shrink-0 animate-ping bg-cyan-400" />
            Awaiting launch command
          </div>
        )}
      </div>

      {/* Sticky Bottom Input */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-500 ease-out sm:px-4 ${
          joined ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="w-full max-w-lg border border-white/20 bg-[#05070a]/90 p-2 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-stretch border border-white/20 bg-black/50 transition-all focus-within:border-cyan-400/50 focus-within:ring-1 focus-within:ring-cyan-400/50">
              <input
                value={playerName}
                onChange={(e) => { setPlayerName(e.target.value.toUpperCase()); setError(null); }}
                placeholder="ENTER CALLSIGN..."
                maxLength={20}
                autoComplete="off"
                autoFocus
                disabled={isJoining}
                className="min-w-0 flex-1 bg-transparent py-3 pl-4 text-base text-white placeholder-slate-600 outline-none sm:py-4 sm:text-lg"
              />
              <button
                type="submit"
                disabled={isJoining || playerName.trim().length < 2}
                className="flex shrink-0 items-center justify-center border-l border-white/20 bg-white/5 px-4 text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-30 disabled:hover:bg-white/5 sm:px-6"
              >
                <ChevronRight className={`size-6 ${isJoining ? "animate-pulse" : ""}`} />
              </button>
            </div>
            <div className="mt-1 min-h-[1.25rem] px-2 text-xs font-bold text-rose-400">{error}</div>
          </form>
        </div>
      </div>
    </Shell>
  );
}

// Helper for text
function memberCount(c: number) {
  return `[ ${c} / ${MAX_MEMBERS} SLOTS OCCUPIED ]`;
}
