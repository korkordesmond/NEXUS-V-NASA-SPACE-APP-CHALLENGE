import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import StageNav from "../components/StageNav";
import { useMission } from "../state/MissionContext";
import { PLANETS, TASKS, tasksFor } from "../data/mission";
import type { Planet } from "../data/mission";
import { useArrowNav } from "../hooks/useArrowNav";
import { useGlobalKeys } from "../keyboard/KeyboardProvider";

const TITLES = ["Enter budget", "Choose planet", "Choose mission"];
const ACTIONS = ["Select budget", "Select planet", "Start building"];

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const glassCard =
  "border border-white/20 bg-[#0a0d12] transition duration-200 hover:border-cyan-400/50 hover:bg-[#0d1119] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60";

const selected = "border-cyan-400/80 bg-[#0f1620]";
const idle = "border-white/10";

const noScrollbar =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/* ═══════════════════════════════════════════════════════════════
   Feasibility — derived from Planet.canLand / canOrbit / canReturn.
   tasksFor(planet) is the single source of truth; flyby is always allowed.
   ═══════════════════════════════════════════════════════════════ */

function planetSupportsTask(planet: Planet | null, task: string | null): boolean {
  if (!planet || !task) return true;
  return tasksFor(planet).some((t) => t.id === task);
}

function planetReason(planet: Planet, task: string | null): string | null {
  if (!task) return null;
  if (planetSupportsTask(planet, task)) return null;
  switch (task) {
    case "land":   return "No solid surface you can land on";
    case "orbit":  return "Too hard to brake into orbit";
    case "return": return "No return trajectory available";
    default:       return `Cannot ${task} this world`;
  }
}

function taskReason(taskId: string, planet: Planet | null): string | null {
  if (!planet) return null;
  if (planetSupportsTask(planet, taskId)) return null;
  switch (taskId) {
    case "land":   return `${planet.name} has no landable surface`;
    case "orbit":  return `Not enough capture delta-v to orbit ${planet.name}`;
    case "return": return `No feasible return window from ${planet.name}`;
    default:       return `Cannot ${taskId} ${planet.name}`;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Spacecraft designs — 8 distinct silhouettes.
   All drawn on a 96×64 grid (or smaller) in `currentColor` line art.
   ═══════════════════════════════════════════════════════════════ */

function ScoutDrone({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <rect x="26" y="26" width="12" height="12" />
      <rect x="29" y="29" width="6" height="6" fill="currentColor" opacity={0.35} />
      <path d="M26 32H14M38 32h12" />
      <rect x="4" y="29" width="10" height="6" />
      <rect x="50" y="29" width="10" height="6" />
      <path d="M32 26V16M28 16h8" />
      <path d="M28 38v6M32 38v9M36 38v6" opacity={0.6} />
    </svg>
  );
}

function CargoHauler({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <rect x="30" y="24" width="36" height="16" />
      <path d="M66 24l10 8-10 8" />
      <rect x="34" y="28" width="8" height="8" />
      <rect x="44" y="28" width="8" height="8" />
      <rect x="54" y="28" width="6" height="8" />
      <path d="M30 32H14M14 24v16M14 24l-6 4M14 40l-6-4" />
      <path d="M30 30h-6v4h6M30 34h-4" opacity={0.6} />
      <path d="M26 40v8M22 44h8" opacity={0.4} />
    </svg>
  );
}

function ExplorerProbe({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M22 20a10 10 0 0120 0" />
      <path d="M32 20v6" />
      <rect x="26" y="26" width="12" height="14" />
      <rect x="29" y="29" width="6" height="6" fill="currentColor" opacity={0.35} />
      <path d="M26 32H16v6h4" />
      <path d="M38 32h10v6h-4" />
      <path d="M28 40l-4 8M36 40l4 8" />
      <path d="M24 48h4M36 48h4" opacity={0.6} />
      <circle cx="32" cy="12" r="1.5" fill="currentColor" stroke="none" opacity={0.8} />
    </svg>
  );
}

function Interceptor({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M14 32l18-6h30l14 6-14 6H32z" />
      <path d="M46 28l8 4-8 4z" fill="currentColor" opacity={0.35} />
      <path d="M32 32L18 18l6 14M64 32l14-14-6 14" />
      <path d="M32 32L18 46l6-14M64 32l14 14-6-14" />
      <path d="M14 32H4M10 28v8" opacity={0.5} />
      <path d="M78 32h8" />
      <path d="M40 32v-3M52 32v-3" opacity={0.6} />
    </svg>
  );
}

function OrbitalStation({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <circle cx="48" cy="48" r="30" />
      <circle cx="48" cy="48" r="26" opacity={0.4} />
      <path d="M18 48h60M48 18v60" />
      <rect x="38" y="38" width="20" height="20" />
      <rect x="43" y="43" width="10" height="10" fill="currentColor" opacity={0.35} />
      <rect x="43" y="14" width="10" height="6" />
      <rect x="43" y="76" width="10" height="6" />
      <rect x="14" y="43" width="6" height="10" />
      <rect x="76" y="43" width="6" height="10" />
      <path d="M48 18v-8M48 86v-8" opacity={0.6} />
    </svg>
  );
}

function Freighter({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <rect x="4" y="26" width="14" height="12" />
      <path d="M4 32H0M8 28v8M12 28v8" opacity={0.5} />
      <path d="M18 32h10" />
      <rect x="28" y="22" width="20" height="20" />
      <rect x="32" y="26" width="4" height="4" opacity={0.5} />
      <rect x="40" y="26" width="4" height="4" opacity={0.5} />
      <rect x="52" y="22" width="20" height="20" />
      <rect x="56" y="26" width="4" height="4" opacity={0.5} />
      <rect x="64" y="26" width="4" height="4" opacity={0.5} />
      <rect x="76" y="22" width="18" height="20" />
      <rect x="80" y="26" width="4" height="4" opacity={0.5} />
      <rect x="88" y="26" width="4" height="4" opacity={0.5} />
      <path d="M94 26h12l6 6-6 6H94" />
      <rect x="100" y="30" width="4" height="4" fill="currentColor" opacity={0.35} />
      <path d="M104 26V16M100 16h8" />
      <path d="M38 42v4M62 42v4M84 42v4" opacity={0.4} />
    </svg>
  );
}

function Telescope({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M14 32a22 22 0 0144 0" />
      <path d="M14 32h44" />
      <path d="M36 10v22" />
      <path d="M24 18l12 14M48 18L36 32" opacity={0.5} />
      <path d="M58 32h56" />
      <path d="M58 26h50l-4 6 4 6H58z" />
      <path d="M64 26v12M72 26v12M80 26v12M88 26v12M96 26v12" opacity={0.35} />
      <rect x="30" y="28" width="12" height="8" />
      <rect x="34" y="30" width="4" height="4" fill="currentColor" opacity={0.4} />
      <path d="M114 32h10" opacity={0.6} />
    </svg>
  );
}

function Lander({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M30 30h36l14 14-14 14H30L16 44z" />
      <rect x="38" y="38" width="20" height="12" opacity={0.6} />
      <rect x="42" y="40" width="4" height="4" fill="currentColor" opacity={0.35} />
      <rect x="50" y="40" width="4" height="4" fill="currentColor" opacity={0.35} />
      <path d="M38 58h20l-4 6H42z" />
      <path d="M48 64v4" opacity={0.5} />
      <path d="M30 44l-18 30M66 44l18 30" />
      <path d="M12 74h10M64 74h10" />
      <path d="M10 74v4M72 74v4" opacity={0.6} />
      <path d="M48 30V18M40 18h16" />
      <rect x="34" y="22" width="8" height="4" opacity={0.5} />
      <rect x="54" y="22" width="8" height="4" opacity={0.5} />
    </svg>
  );
}

function SurveySkiff({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M10 40c10-16 34-24 60-20l6 8-6 8c-24 4-44 0-60-4z" />
      <path d="M56 22l10 6-10 6z" fill="currentColor" opacity={0.35} />
      <path d="M42 26V14M36 14h12M42 14l6-6" />
      <path d="M16 38l-8 6M16 30l-8-6" opacity={0.5} />
      <path d="M6 32h6M4 36h8M6 40h6" opacity={0.3} />
      <rect x="52" y="38" width="10" height="6" />
    </svg>
  );
}

type Craft = {
  id: string;
  Comp: (props: { className?: string }) => ReactElement;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
  flip?: boolean;
};

const CRAFTS: Craft[] = [
  { id: "scout-a",    Comp: ScoutDrone,      top: "6%",  left: "1%",  size: 56,  duration: 46, delay: 0,  drift: 14,  opacity: 0.12 },
  { id: "freighter-a",Comp: Freighter,       top: "28%", left: "-3%", size: 150, duration: 70, delay: 9,  drift: 22,  opacity: 0.09 },
  { id: "lander-a",   Comp: Lander,          top: "62%", left: "2%",  size: 88,  duration: 58, delay: 3,  drift: 16,  opacity: 0.11 },
  { id: "probe-a",    Comp: ExplorerProbe,   top: "84%", left: "4%",  size: 44,  duration: 52, delay: 11, drift: -10, opacity: 0.13 },
  { id: "hauler-a",   Comp: CargoHauler,     top: "10%", left: "84%", size: 96,  duration: 62, delay: 6,  drift: -18, opacity: 0.10 },
  { id: "station-a",  Comp: OrbitalStation,  top: "38%", left: "89%", size: 130, duration: 80, delay: 0,  drift: -12, opacity: 0.08 },
  { id: "interceptor-a",Comp: Interceptor,   top: "72%", left: "82%", size: 110, duration: 44, delay: 4,  drift: -24, opacity: 0.12 },
  { id: "telescope-a",Comp: Telescope,       top: "88%", left: "86%", size: 120, duration: 74, delay: 13, drift: -14, opacity: 0.09 },
  { id: "skiff-a",    Comp: SurveySkiff,     top: "2%",  left: "42%", size: 72,  duration: 56, delay: 7,  drift: 20,  opacity: 0.07, flip: true },
  { id: "scout-b",    Comp: ScoutDrone,      top: "90%", left: "54%", size: 48,  duration: 40, delay: 2,  drift: -12, opacity: 0.10, flip: true },
  { id: "probe-b",    Comp: ExplorerProbe,   top: "94%", left: "24%", size: 36,  duration: 48, delay: 10, drift: 10,  opacity: 0.11 },
  { id: "interceptor-b",Comp: Interceptor,   top: "4%",  left: "22%", size: 64,  duration: 42, delay: 5,  drift: 18,  opacity: 0.08, flip: true },
];

const STARFIELD = [
  "radial-gradient(1px 1px at 8% 14%, #fff, transparent)",
  "radial-gradient(1.5px 1.5px at 22% 78%, #fff, transparent)",
  "radial-gradient(1px 1px at 35% 32%, #fff, transparent)",
  "radial-gradient(1px 1px at 48% 90%, #fff, transparent)",
  "radial-gradient(1.5px 1.5px at 63% 20%, #fff, transparent)",
  "radial-gradient(1px 1px at 74% 66%, #fff, transparent)",
  "radial-gradient(1px 1px at 86% 38%, #fff, transparent)",
  "radial-gradient(1.5px 1.5px at 93% 84%, #fff, transparent)",
  "radial-gradient(1px 1px at 14% 52%, #fff, transparent)",
  "radial-gradient(1px 1px at 57% 54%, #fff, transparent)",
].join(", ");

function SpacecraftBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: STARFIELD }} />

      {CRAFTS.map(({ id, Comp, top, left, size, duration, delay, drift, opacity, flip }) => (
        <div
          key={id}
          className="absolute animate-craft-drift will-change-transform"
          style={{
            top,
            left,
            width: size,
            height: size * (64 / 96),
            opacity,
            color: "#22d3ee",
            transform: flip ? "scaleX(-1)" : undefined,
            animationDuration: `${duration}s`,
            animationDelay: `-${delay}s`,
            "--drift": `${drift}px`,
          } as CSSProperties}
        >
          <Comp className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}

/* ─────────── Budget step ─────────── */

function BudgetStep() {
  const { mission, update } = useMission();
  const gridRef = useRef<HTMLDivElement>(null);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

  useArrowNav(gridRef, "button", { orientation: "grid" });

  const press = (k: string) => {
    if (k === "C") return update({ budget: 0 });
    if (k === "⌫") return update({ budget: Math.floor(mission.budget / 10) });
    const next = Number(`${mission.budget}${k}`);
    if (next <= 999_999_999_999) update({ budget: next });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  let displayValue = mission.budget.toLocaleString();
  let suffix = "M";

  if (mission.budget >= 1_000_000) {
    displayValue = (mission.budget / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 });
    suffix = "T";
  } else if (mission.budget >= 1_000) {
    displayValue = (mission.budget / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 });
    suffix = "B";
  }

  return (
    <div className="flex h-full min-h-0 flex-col items-center gap-6 overflow-y-auto py-2 sm:gap-8 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto">
      <div className="relative w-full max-w-sm shrink-0 border border-white/20 bg-[#0a0d12] px-5 py-5 sm:px-8 sm:py-6">
        <div className="absolute -left-[1px] -top-[1px] size-3 border-l-2 border-t-2 border-cyan-400" />
        <div className="absolute -right-[1px] -top-[1px] size-3 border-r-2 border-t-2 border-cyan-400" />
        <div className="absolute -bottom-[1px] -left-[1px] size-3 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute -bottom-[1px] -right-[1px] size-3 border-b-2 border-r-2 border-cyan-400" />
        
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-400" style={{ fontFamily: MONO }}>
          Mission Budget
        </p>
        <p className="flex min-w-0 items-baseline justify-end gap-1 tabular-nums text-white" style={{ fontFamily: MONO }}>
          <span className="text-lg text-slate-500">$</span>
          <span className="text-4xl font-medium tracking-tight">{displayValue}</span>
          <span className="text-lg font-medium text-slate-400">{suffix}</span>
        </p>
      </div>

      <div ref={gridRef} className="grid shrink-0 grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="grid size-14 place-items-center border border-white/20 bg-[#0a0d12] text-2xl text-slate-100 transition hover:border-cyan-400/50 hover:bg-[#0f1620] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-95 sm:size-16"
            style={{ fontFamily: MONO }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── Planet visuals ─────────── */

const SHADE =
  "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.32), transparent 42%), radial-gradient(circle at 72% 78%, transparent 38%, rgba(0,0,0,0.6) 100%)";

interface PlanetLook {
  scale: number;
  base: string;
  details?: string;
  glow: string;
  tag: string;
  ring?: boolean;
}

const PLANET_LOOK: Record<string, PlanetLook> = {
  mercury: { scale: 0.62, base: "radial-gradient(circle, #a8a29e, #78716c)", details: "radial-gradient(circle at 35% 55%, rgba(0,0,0,.28) 0 8%, transparent 9%), radial-gradient(circle at 62% 32%, rgba(0,0,0,.25) 0 6%, transparent 7%), radial-gradient(circle at 58% 70%, rgba(0,0,0,.3) 0 10%, transparent 11%), radial-gradient(circle at 25% 28%, rgba(0,0,0,.2) 0 5%, transparent 6%)", glow: "rgba(168,162,158,0.35)", tag: "Fastest orbit" },
  venus: { scale: 0.85, base: "radial-gradient(circle, #f3d28a, #c99a3e)", details: "repeating-linear-gradient(160deg, rgba(255,255,255,.16) 0 8%, transparent 8% 20%)", glow: "rgba(243,210,138,0.4)", tag: "Hottest surface" },
  mars: { scale: 0.7, base: "radial-gradient(circle, #e0653a, #b03a12)", details: "radial-gradient(ellipse 38% 16% at 50% 6%, rgba(255,255,255,.85), transparent 100%), radial-gradient(ellipse 30% 18% at 38% 55%, rgba(80,20,5,.45), transparent 100%), radial-gradient(ellipse 22% 14% at 66% 42%, rgba(80,20,5,.35), transparent 100%)", glow: "rgba(224,101,58,0.4)", tag: "The red planet" },
  jupiter: { scale: 1, base: "linear-gradient(180deg, #d8b48a 0% 12%, #a9754a 12% 22%, #e7cfa6 22% 38%, #b5835a 38% 50%, #dcc093 50% 66%, #a06b45 66% 78%, #d8b48a 78% 100%)", details: "radial-gradient(ellipse 16% 10% at 66% 62%, rgba(170,60,35,.95) 0 50%, rgba(170,60,35,0) 100%)", glow: "rgba(216,180,138,0.35)", tag: "Largest planet" },
  saturn: { scale: 0.88, base: "linear-gradient(180deg, #e8d8a8 0% 20%, #cdb67f 20% 38%, #ead9ab 38% 58%, #c4ab74 58% 76%, #e3d09c 76% 100%)", glow: "rgba(232,216,168,0.35)", tag: "Famous for its rings", ring: true },
  neptune: { scale: 0.8, base: "radial-gradient(circle, #5b8def, #2347b8)", details: "radial-gradient(ellipse 22% 12% at 40% 58%, rgba(10,25,90,.6), transparent 100%), linear-gradient(170deg, rgba(255,255,255,.12) 0 20%, transparent 20% 45%, rgba(255,255,255,.1) 45% 60%, transparent 60%)", glow: "rgba(91,141,239,0.5)", tag: "Windiest world" },
};

const FALLBACK_LOOK: PlanetLook = { scale: 0.8, base: "radial-gradient(circle, #9ca3af, #4b5563)", glow: "rgba(156,163,175,0.3)", tag: "" };

const lookOf = (id: string) => PLANET_LOOK[id] ?? FALLBACK_LOOK;

const RING_BANDS = [
  { w: "200%", h: "56%", style: "border-[0.28rem] border-amber-100/55" },
  { w: "164%", h: "44%", style: "border-[0.16rem] border-amber-200/35" },
];

function Ring({ front }: { front?: boolean }) {
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 -rotate-[18deg] ${front ? "z-20" : "z-0"}`}>
      {RING_BANDS.map((b) => (
        <span key={b.w} className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${b.style} ${front ? "[clip-path:inset(50%_0_0_0)]" : "[clip-path:inset(0_0_50%_0)]"}`} style={{ width: b.w, height: b.h }} />
      ))}
    </span>
  );
}

function PlanetOrb({ id, active, delay, dimmed }: { id: string; active: boolean; delay: number; dimmed?: boolean }) {
  const look = lookOf(id);
  const size = `${look.scale * 100}%`;

  return (
    <span
      className={`block motion-safe:animate-float ${dimmed ? "grayscale" : ""}`}
      style={{ animationDelay: `${delay}s`, opacity: dimmed ? 0.45 : 1 }}
    >
      <span className="flex size-[clamp(2.75rem,min(11vh,20vw),6rem)] items-center justify-center transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110 group-disabled:group-hover:scale-100">
        <span className="relative" style={{ width: size, height: size }}>
          {look.ring && <Ring />}
          <span
            className="absolute inset-0 z-10 rounded-full transition-shadow duration-500"
            style={{
              background: `${SHADE}, ${look.details ? `${look.details}, ` : ""}${look.base}`,
              boxShadow: active ? `0 0 0 2px rgba(34,211,238,0.9), 0 0 44px 8px ${look.glow}` : `0 0 22px 2px ${look.glow}`,
            }}
          />
          {look.ring && <Ring front />}
        </span>
      </span>
    </span>
  );
}

function PlanetStep() {
  const { mission, update } = useMission();
  const gridRef = useRef<HTMLDivElement>(null);
  useArrowNav(gridRef, "button", { orientation: "grid", autoFocus: true });

  return (
    <div className="relative flex h-full min-h-0 justify-center overflow-y-auto">
      <div ref={gridRef} className="relative grid h-full max-h-[30rem] w-full max-w-3xl grid-cols-2 grid-rows-[repeat(3,minmax(8.5rem,1fr))] gap-3 p-2 sm:grid-cols-3 sm:grid-rows-[repeat(2,minmax(8.5rem,1fr))] sm:gap-4">
        {PLANETS.map((p, i) => {
          const isActive = mission.planet?.id === p.id;
          const feasible = planetSupportsTask(p, mission.task);
          const reason = planetReason(p, mission.task);
          return (
            <button
              key={p.id}
              disabled={!feasible}
              onClick={(e) => {
                if (!feasible) return;
                update({ planet: p });
                (e.currentTarget as HTMLButtonElement).focus();
              }}
              data-advance={feasible || undefined}
              aria-pressed={isActive}
              aria-disabled={!feasible}
              title={reason ?? undefined}
              className={`group relative flex min-h-0 flex-col items-center justify-center gap-2 border bg-[#0a0d12] p-3 text-center transition
                ${isActive ? "border-cyan-400/80 bg-[#0f1620]" : "border-white/10"}
                ${feasible
                  ? "hover:border-white/30 hover:bg-[#0f1620] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60"
                  : "cursor-not-allowed border-dashed opacity-60"}`}
            >
              <PlanetOrb id={p.id} active={isActive} delay={i * -0.9} dimmed={!feasible} />
              <span className="flex flex-col items-center">
                <span className={`text-[clamp(0.95rem,2.6vh,1.25rem)] font-semibold leading-tight tracking-tight transition-colors duration-300 ${isActive ? "text-cyan-300" : feasible ? "text-white" : "text-slate-500"}`} style={{ fontFamily: SERIF }}>
                  {p.name}
                </span>
                <span className="text-[clamp(0.6rem,1.5vh,0.75rem)] tabular-nums text-slate-400" style={{ fontFamily: MONO }}>
                  {p.distanceAU} AU
                </span>
                <span className="mt-1 hidden text-[0.7rem] italic text-slate-500 [@media(min-height:700px)]:block" style={{ fontFamily: SERIF }}>
                  {!feasible ? "Mission unavailable" : lookOf(p.id).tag}
                </span>
                <span aria-hidden className={`mt-2 h-0.5 bg-cyan-400 transition-all duration-300 ${isActive ? "w-8 opacity-100" : "w-0 opacity-0"}`} />
              </span>
              {!feasible && (
                <span className="pointer-events-none absolute right-2 top-2 border border-white/15 bg-black/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400" style={{ fontFamily: MONO }}>
                  N/A
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Day stepper ─────────── */

function DayStepper({ value, onChange, min = 1, max = 999 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const set = (n: number) => onChange(clamp(n));

  const btn = "grid size-10 place-items-center border border-white/20 bg-[#0a0d12] text-lg text-slate-200 transition hover:border-cyan-400/50 hover:bg-[#0f1620] active:scale-95 disabled:opacity-30 focus-visible:outline-none";

  const bump = (d: number) => {
    const n = clamp(value + d);
    onChange(n);
    setDraft(String(n));
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); bump(1); }
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); bump(-1); }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-white/20 bg-[#0a0d12] px-4 py-3 sm:px-5">
      <span className="text-sm font-medium uppercase tracking-wider text-slate-300" style={{ fontFamily: MONO }}>
        How many days?
      </span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Decrease days" className={btn}>−</button>
        <input
          type="number"
          min={min} max={max}
          value={draft ?? String(value)}
          onFocus={() => setDraft(String(value))}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            const n = Number(text);
            if (text !== "" && Number.isFinite(n) && n >= min) set(n);
          }}
          onBlur={() => {
            const n = clamp(Number(draft ?? value) || min);
            onChange(n);
            setDraft(null);
          }}
          onKeyDown={onInputKey}
          aria-label="Days"
          className="w-16 border-b border-white/20 bg-transparent text-center text-xl tabular-nums text-white outline-none [appearance:textfield] focus:border-cyan-400"
          style={{ fontFamily: MONO }}
        />
        <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Increase days" className={btn}>+</button>
      </div>
    </div>
  );
}

/* ─────────── Task step ─────────── */

function TaskStep() {
  const { mission, update } = useMission();
  const listRef = useRef<HTMLDivElement>(null);
  useArrowNav(listRef, "button", { orientation: "vertical", autoFocus: true });

  return (
    <div ref={listRef} className={`flex h-full min-h-0 w-full overflow-y-auto ${noScrollbar}`}>
      <div className="m-auto flex w-full max-w-lg flex-col gap-3 px-2 py-3">
        {TASKS.map((t) => {
          const isActive = mission.task === t.id;
          const feasible = planetSupportsTask(mission.planet, t.id);
          const reason = taskReason(t.id, mission.planet);
          return (
            <div key={t.id} className="flex flex-col gap-3">
              <button
                disabled={!feasible}
                onClick={(e) => {
                  if (!feasible) return;
                  update({ task: t.id });
                  (e.currentTarget as HTMLButtonElement).focus();
                }}
                data-advance={feasible || undefined}
                aria-pressed={isActive}
                aria-disabled={!feasible}
                title={reason ?? undefined}
                className={`${glassCard} relative p-5 text-left
                  ${isActive ? selected : idle}
                  ${!feasible ? "cursor-not-allowed border-dashed opacity-60 hover:border-white/10 hover:bg-[#0a0d12] focus-visible:outline-none" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`font-semibold tracking-tight ${feasible ? "text-white" : "text-slate-500"}`} style={{ fontFamily: SERIF }}>{t.title}</p>
                  {!feasible && (
                    <span className="shrink-0 border border-white/15 bg-black/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400" style={{ fontFamily: MONO }}>
                      N/A
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm leading-relaxed ${feasible ? "text-slate-400" : "text-slate-600"}`} style={{ fontFamily: MONO }}>{t.description}</p>
                {!feasible && reason && (
                  <p className="mt-2 text-[11px] italic text-slate-500" style={{ fontFamily: SERIF }}>{reason}</p>
                )}
              </button>

              {t.id === "orbit" && feasible && (
                <div className={`grid transition-all duration-300 ease-in-out ${isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="pb-2">
                      <DayStepper value={mission.orbitDays} onChange={(n) => update({ orbitDays: n })} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Page ─────────── */

export default function Plan() {
  const navigate = useNavigate();
  const { mission, update } = useMission();
  const [sub, setSub] = useState(0);

  /* Auto-heal: if loaded state has an infeasible planet+task pair
     (e.g. from storage or after planet data changes), drop the newer
     selection so the user isn't stuck with a disabled Next button. */
  useEffect(() => {
    if (!planetSupportsTask(mission.planet, mission.task)) {
      if (mission.task) update({ task: null });
      else if (mission.planet) update({ planet: null });
    }
  }, [mission.planet, mission.task, update]);

  const valid = [
    mission.budget > 0,
    mission.planet !== null && planetSupportsTask(mission.planet, mission.task),
    mission.task !== null
      && planetSupportsTask(mission.planet, mission.task)
      && (mission.task !== "orbit" || mission.orbitDays >= 1),
  ][sub];

  const isLast = sub === TITLES.length - 1;
  const next = () => (isLast ? navigate("/build") : setSub(sub + 1));
  const prev = () => setSub(sub - 1);

  useGlobalKeys({
    advance: next,
    back: sub > 0 ? prev : undefined,
    canAdvance: () => valid,
  });

  return (
    <section className="relative flex h-full flex-col overflow-hidden px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
      <SpacecraftBackdrop />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="mx-auto w-full max-w-3xl shrink-0 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl" style={{ fontFamily: SERIF }}>
            {TITLES[sub]}
          </h1>
          <div className="mt-4 flex items-center justify-center gap-2" aria-hidden>
            {TITLES.map((_, i) => (
              <span key={i} className={`h-1.5 transition-all duration-300 ${i === sub ? "w-10 bg-cyan-400" : i < sub ? "w-6 bg-cyan-400/40" : "w-6 bg-white/15"}`} />
            ))}
          </div>
        </header>

        <div className={`relative flex min-h-0 flex-1 flex-col py-4 sm:py-6 ${noScrollbar}`}>
          {sub === 0 && <BudgetStep />}
          {sub === 1 && <PlanetStep />}
          {sub === 2 && <TaskStep />}
        </div>

        <div className="shrink-0 pt-2">
          <StageNav onPrev={sub > 0 ? prev : undefined} onNext={next} nextDisabled={!valid}>
            <button
              onClick={next}
              disabled={!valid}
              className="group inline-flex items-center gap-2 border border-cyan-400/50 bg-[#0f1620] px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] sm:px-10 text-cyan-300 transition hover:bg-[#142033] disabled:cursor-not-allowed disabled:opacity-30"
              style={{ fontFamily: MONO }}
            >
              {ACTIONS[sub]}
              <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </button>
          </StageNav>
        </div>
      </div>
    </section>
  );
}