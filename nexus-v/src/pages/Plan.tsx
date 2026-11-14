import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import StageNav from "../components/StageNav";
import { useMission } from "../state/MissionContext";
import { PLANETS, TASKS } from "../data/mission";
import { useArrowNav } from "../hooks/useArrowNav";
import { useGlobalKeys } from "../keyboard/KeyboardProvider";

const TITLES = ["Enter budget", "Choose planet", "Choose mission"];
const ACTIONS = ["Select budget", "Select planet", "Start building"];

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const glassCard =
  "border border-white/20 bg-black/40 transition duration-200 hover:border-cyan-400/50 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60";

const selected = "border-cyan-400/80 bg-cyan-400/10";
const idle = "border-white/10";

const noScrollbar =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

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
    <div className="flex h-full flex-col items-center justify-center gap-8">
      <div className="relative w-full max-w-sm border border-white/20 bg-black/60 px-8 py-6">
        <div className="absolute -left-[1px] -top-[1px] size-3 border-l-2 border-t-2 border-cyan-400" />
        <div className="absolute -right-[1px] -top-[1px] size-3 border-r-2 border-t-2 border-cyan-400" />
        <div className="absolute -bottom-[1px] -left-[1px] size-3 border-b-2 border-l-2 border-cyan-400" />
        <div className="absolute -bottom-[1px] -right-[1px] size-3 border-b-2 border-r-2 border-cyan-400" />
        
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-400" style={{ fontFamily: MONO }}>
          Mission Budget
        </p>
        <p className="flex items-baseline justify-end gap-1 tabular-nums text-white" style={{ fontFamily: MONO }}>
          <span className="text-lg text-slate-500">$</span>
          <span className="text-5xl font-medium tracking-tight">{displayValue}</span>
          <span className="text-lg font-medium text-slate-400">{suffix}</span>
        </p>
      </div>

      <div ref={gridRef} className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="grid size-16 place-items-center border border-white/20 bg-white/5 text-2xl text-slate-100 transition hover:border-cyan-400/50 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-95"
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

function PlanetOrb({ id, active, delay }: { id: string; active: boolean; delay: number }) {
  const look = lookOf(id);
  const size = `${look.scale * 100}%`;

  return (
    <span className="block motion-safe:animate-float" style={{ animationDelay: `${delay}s` }}>
      <span className="flex size-[clamp(2.75rem,min(11vh,20vw),6rem)] items-center justify-center transition-transform duration-300 group-hover:scale-110 group-focus-visible:scale-110">
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

const STARS = [
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

function PlanetStep() {
  const { mission, update } = useMission();
  const gridRef = useRef<HTMLDivElement>(null);
  useArrowNav(gridRef, "button", { orientation: "grid", autoFocus: true });

  return (
    <div className="relative flex h-full items-center justify-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: STARS }} />
      <div ref={gridRef} className="relative grid h-full max-h-[30rem] w-full max-w-3xl grid-cols-2 grid-rows-[repeat(3,minmax(0,1fr))] gap-4 p-2 sm:grid-cols-3 sm:grid-rows-[repeat(2,minmax(0,1fr))]">
        {PLANETS.map((p, i) => {
          const isActive = mission.planet?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={(e) => { update({ planet: p }); (e.currentTarget as HTMLButtonElement).focus(); }}
              data-advance
              aria-pressed={isActive}
              className="group flex min-h-0 flex-col items-center justify-center gap-2 border border-white/10 bg-black/40 p-3 text-center transition hover:border-white/30 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60"
            >
              <PlanetOrb id={p.id} active={isActive} delay={i * -0.9} />
              <span className="flex flex-col items-center">
                <span className={`text-[clamp(0.95rem,2.6vh,1.25rem)] font-semibold leading-tight tracking-tight transition-colors duration-300 ${isActive ? "text-cyan-300" : "text-white"}`} style={{ fontFamily: SERIF }}>
                  {p.name}
                </span>
                <span className="text-[clamp(0.6rem,1.5vh,0.75rem)] tabular-nums text-slate-400" style={{ fontFamily: MONO }}>
                  {p.distanceAU} AU
                </span>
                <span className="mt-1 hidden text-[0.7rem] italic text-slate-500 [@media(min-height:700px)]:block" style={{ fontFamily: SERIF }}>
                  {lookOf(p.id).tag}
                </span>
                <span aria-hidden className={`mt-2 h-0.5 bg-cyan-400 transition-all duration-300 ${isActive ? "w-8 opacity-100" : "w-0 opacity-0"}`} />
              </span>
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

  const btn = "grid size-10 place-items-center border border-white/20 bg-white/5 text-lg text-slate-200 transition hover:border-cyan-400/50 hover:bg-cyan-400/10 active:scale-95 disabled:opacity-30 focus-visible:outline-none";

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
    <div className="flex items-center justify-between border border-white/20 bg-black/40 px-5 py-3">
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
    <div ref={listRef} className={`mx-auto flex h-full w-full max-w-lg flex-col justify-start overflow-y-auto py-3 my-auto ${noScrollbar}`}>
      <div className="flex flex-col gap-3 px-2">
        {TASKS.map((t) => {
          const isActive = mission.task === t.id;
          return (
            <div key={t.id} className="flex flex-col gap-3">
              <button
                onClick={(e) => { update({ task: t.id }); (e.currentTarget as HTMLButtonElement).focus(); }}
                data-advance
                aria-pressed={isActive}
                className={`${glassCard} ${isActive ? selected : idle} p-5 text-left`}
              >
                <p className="font-semibold tracking-tight text-white" style={{ fontFamily: SERIF }}>{t.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400" style={{ fontFamily: MONO }}>{t.description}</p>
              </button>

              {t.id === "orbit" && (
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
  const { mission } = useMission();
  const [sub, setSub] = useState(0);

  const valid = [
    mission.budget > 0,
    mission.planet !== null,
    mission.task !== null && (mission.task !== "orbit" || mission.orbitDays >= 1),
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
    <section className="flex h-full flex-col overflow-hidden px-6 pb-4 pt-6">
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

      <div className={`relative flex min-h-0 flex-1 flex-col py-6 ${noScrollbar}`}>
        {sub === 0 && <BudgetStep />}
        {sub === 1 && <PlanetStep />}
        {sub === 2 && <TaskStep />}
      </div>

      <div className="shrink-0 pt-2">
        <StageNav onPrev={sub > 0 ? prev : undefined} onNext={next} nextDisabled={!valid}>
          <button
            onClick={next}
            disabled={!valid}
            className="group inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-400/10 px-10 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ fontFamily: MONO }}
          >
            {ACTIONS[sub]}
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </button>
        </StageNav>
      </div>
    </section>
  );
}