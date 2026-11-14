import { useEffect, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { Link } from "react-router-dom";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';

const STEPS = [
  { title: "Plan", body: "Set a budget, pick a planet, and choose your mission." },
  { title: "Build", body: "Assemble your craft. Every part adds mass, power and cost." },
  { title: "Launch", body: "Watch the mission live with resources and camera feeds." },
  { title: "Feedback", body: "See your score and why it worked — or didn't." },
] as const;

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ChevronLeft({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/* ---------------------------------------------------------------
   Spacecraft SVGs — minimal pixel/schematic style, drawn in
   currentColor so they inherit opacity & tint from the wrapper.
   --------------------------------------------------------------- */
function ScoutDrone({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      {/* body */}
      <rect x="26" y="26" width="12" height="12" />
      {/* cockpit */}
      <rect x="29" y="29" width="6" height="6" fill="currentColor" opacity={0.35} />
      {/* arms */}
      <path d="M26 32H14M38 32h12" />
      {/* panels */}
      <rect x="4" y="29" width="10" height="6" />
      <rect x="50" y="29" width="10" height="6" />
      {/* antenna */}
      <path d="M32 26V16M28 16h8" />
      {/* thruster glow */}
      <path d="M28 38v6M32 38v9M36 38v6" opacity={0.6} />
    </svg>
  );
}

function CargoHauler({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      {/* hull */}
      <rect x="30" y="24" width="36" height="16" />
      {/* nose */}
      <path d="M66 24l10 8-10 8" />
      {/* cargo pods */}
      <rect x="34" y="28" width="8" height="8" />
      <rect x="44" y="28" width="8" height="8" />
      <rect x="54" y="28" width="6" height="8" />
      {/* solar arrays */}
      <path d="M30 32H14M14 24v16M14 24l-6 4M14 40l-6-4" />
      {/* engines */}
      <path d="M30 30h-6v4h6M30 34h-4" opacity={0.6} />
      <path d="M26 40v8M22 44h8" opacity={0.4} />
    </svg>
  );
}

function ExplorerProbe({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" className={className} aria-hidden="true">
      {/* dish */}
      <path d="M22 20a10 10 0 0120 0" />
      <path d="M32 20v6" />
      {/* core */}
      <rect x="26" y="26" width="12" height="14" />
      <rect x="29" y="29" width="6" height="6" fill="currentColor" opacity={0.35} />
      {/* side instruments */}
      <path d="M26 32H16v6h4" />
      <path d="M38 32h10v6h-4" />
      {/* legs / thrusters */}
      <path d="M28 40l-4 8M36 40l4 8" />
      <path d="M24 48h4M36 48h4" opacity={0.6} />
      {/* beacon */}
      <circle cx="32" cy="12" r="1.5" fill="currentColor" stroke="none" opacity={0.8} />
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
  { id: "scout-a",    Comp: ScoutDrone,    top: "12%", left: "8%",  size: 56,  duration: 42, delay: 0,   drift: 18,  opacity: 0.18 },
  { id: "hauler-a",   Comp: CargoHauler,   top: "22%", left: "70%", size: 92,  duration: 58, delay: 4,   drift: -22, opacity: 0.14 },
  { id: "probe-a",    Comp: ExplorerProbe, top: "68%", left: "16%", size: 64,  duration: 50, delay: 8,   drift: 14,  opacity: 0.16 },
  { id: "scout-b",    Comp: ScoutDrone,    top: "78%", left: "82%", size: 44,  duration: 36, delay: 2,   drift: -12, opacity: 0.20, flip: true },
  { id: "hauler-b",   Comp: CargoHauler,   top: "48%", left: "-4%", size: 76,  duration: 64, delay: 12,  drift: 26,  opacity: 0.10 },
  { id: "probe-b",    Comp: ExplorerProbe, top: "6%",  left: "44%", size: 40,  duration: 46, delay: 6,   drift: -16, opacity: 0.12, flip: true },
];

export default function Landing() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const nextStep = () => setActive((i) => (i + 1) % STEPS.length);
  const prevStep = () => setActive((i) => (i - 1 + STEPS.length) % STEPS.length);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#05070a] text-slate-100 selection:bg-cyan-400/30" style={{ fontFamily: MONO }}>

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

      {/* Spacecraft Layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {CRAFTS.map(({ id, Comp, top, left, size, duration, delay, drift, opacity, flip }) => (
          <div
            key={id}
            className="absolute will-change-transform animate-craft-drift"
            style={{
              top,
              left,
              width: size,
              height: size,
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

      <div className="relative z-10 flex flex-1 flex-col p-4 sm:p-8">

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-4">
          <h1 className="text-xl font-bold tracking-widest text-white uppercase" style={{ fontFamily: MONO }}>
            Nexus<span className="text-cyan-400">V</span>
          </h1>

          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap border border-white/20 bg-white/5 px-2 py-1.5 text-[10px] uppercase tracking-widest text-slate-300 sm:px-3 sm:text-xs">
            <span className="size-2 animate-pulse bg-cyan-400" />
            Multiplayer_Online
          </div>
        </header>

        {/* Main Content */}
        <section className="flex flex-1 flex-col justify-center py-6 sm:py-8">
          <div
            key={active}
            className="mx-auto flex w-full max-w-5xl animate-slide-in flex-col gap-6 lg:grid lg:grid-cols-[1fr_2fr] lg:items-stretch"
          >
            {/* Left Side: Title & Navigation */}
            <div className="flex flex-col justify-between border border-white/20 bg-black/40 p-5 sm:p-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-500 mb-2">
                  Phase 0{active + 1}
                </p>
                <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: SERIF }}>
                  {step.title}
                </h2>
              </div>

              {/* Chevron-only Navigation */}
              <div className="mt-8 flex items-center gap-4 sm:mt-12">
                <button
                  onClick={prevStep}
                  className="flex size-12 items-center justify-center border border-white/20 bg-white/5 text-slate-400 transition hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={nextStep}
                  className="flex size-12 items-center justify-center border border-white/20 bg-white/5 text-slate-400 transition hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300"
                >
                  <ChevronRight className="size-6" />
                </button>
              </div>
            </div>

            {/* Right Side: Description Panel */}
            <div className="relative flex min-h-[10rem] flex-col justify-center border border-white/20 bg-white/[0.02] p-5 sm:min-h-[16rem] sm:p-8 lg:p-12">
              {/* Corner Brackets */}
              <div className="absolute -left-[1px] -top-[1px] size-4 border-l-2 border-t-2 border-cyan-400" />
              <div className="absolute -right-[1px] -top-[1px] size-4 border-r-2 border-t-2 border-cyan-400" />
              <div className="absolute -bottom-[1px] -left-[1px] size-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute -bottom-[1px] -right-[1px] size-4 border-b-2 border-r-2 border-cyan-400" />

              <p className="text-lg leading-relaxed text-slate-300 sm:text-xl" style={{ fontFamily: SERIF }}>
                {step.body}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex shrink-0 flex-col gap-6 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {/* Progress Dots */}
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setActive(i)}
                aria-label={`Show ${s.title}`}
                className={`h-2 transition-all duration-300 ${
                  i === active ? "w-8 bg-cyan-400" : "w-4 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* CTA Link */}
          <Link
            to="/team"
            className="group flex w-full items-center justify-between border border-cyan-400/50 bg-cyan-400/10 px-4 py-3 sm:w-auto sm:px-6 sm:py-4 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/20"
          >
            Initialize Team
            <span className="ml-4 flex size-8 items-center justify-center bg-cyan-400 text-[#05070a] transition-transform group-hover:translate-x-1">
              <ChevronRight className="size-5" />
            </span>
          </Link>
        </footer>
      </div>
    </div>
  );
}