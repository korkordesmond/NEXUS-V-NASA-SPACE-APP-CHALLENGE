import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';

const STEPS = [
  {
    title: "Plan",
    body: "Set a budget, pick a planet, and choose your mission.",
  },
  {
    title: "Build",
    body: "Assemble your craft. Every part adds mass, power and cost.",
  },
  {
    title: "Launch",
    body: "Watch the mission live with resources and camera feeds.",
  },
  {
    title: "Feedback",
    body: "See your score and why it worked — or didn't.",
  },
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
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#05070a] text-slate-100 selection:bg-cyan-400/30" style={{ fontFamily: MONO }}>
      
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-4 sm:p-8">
        
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 pb-4">
          <h1 className="text-xl font-bold tracking-widest text-white uppercase" style={{ fontFamily: MONO }}>
            Nexus<span className="text-cyan-400">V</span>
          </h1>

          <div className="flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-widest text-slate-300">
            <span className="size-2 animate-pulse bg-cyan-400" />
            Multiplayer_Online
          </div>
        </header>

        {/* Main Content */}
        <section className="flex flex-1 flex-col justify-center py-8">
          <div 
            key={active}
            className="mx-auto flex w-full max-w-5xl animate-slide-in flex-col gap-6 lg:grid lg:grid-cols-[1fr_2fr] lg:items-stretch"
          >
            {/* Left Side: Title & Navigation */}
            <div className="flex flex-col justify-between border border-white/20 bg-black/40 p-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-500 mb-2">
                  Phase 0{active + 1}
                </p>
                <h2 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl" style={{ fontFamily: SERIF }}>
                  {step.title}
                </h2>
              </div>

              {/* Chevron-only Navigation */}
              <div className="mt-12 flex items-center gap-4">
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
            <div className="relative flex min-h-[16rem] flex-col justify-center border border-white/20 bg-white/[0.02] p-8 lg:p-12">
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
          {/* Progress Dots (Can stay as they are, but make them square for pixel feel) */}
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

          {/* Chevron-only Navigation for Link */}
          <Link
            to="/team"
            className="group flex items-center justify-between border border-cyan-400/50 bg-cyan-400/10 px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/20"
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