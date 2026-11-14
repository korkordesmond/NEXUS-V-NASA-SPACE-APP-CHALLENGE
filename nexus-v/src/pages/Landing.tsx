import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";

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

function ChevronRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function Landing() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  // Auto-advance the carousel every 6 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, 6000);
    
    // Cleanup on unmount
    return () => clearInterval(id);
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#070912] text-slate-100">
      {/* Ambient backdrop */}
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
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between px-6 py-6 sm:px-10 md:px-16">
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            style={{ fontFamily: SERIF }}
          >
            Nexus<span className="text-cyan-300">V</span>
          </h1>

          <div
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md sm:flex"
            style={{ fontFamily: SANS }}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-cyan-400" />
            </span>
            Multiplayer
          </div>
        </header>

        {/* Tutorial Carousel */}
        <section className="flex min-h-0 flex-1 items-center px-4 sm:px-6 md:px-10 lg:px-16">
          <div
            key={active}
            className="flex w-full animate-slide-in flex-col items-start gap-8 lg:grid lg:grid-cols-[minmax(0,32fr)_minmax(0,68fr)] lg:items-center lg:gap-12"
          >
            <h2
              className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-transparent sm:text-6xl lg:text-7xl"
              style={{ fontFamily: SERIF }}
            >
              {step.title}
            </h2>

            <div className="relative flex min-h-[22rem] w-full flex-col justify-center overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 text-center shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:min-h-[26rem] sm:p-12 lg:min-h-[30rem] lg:p-14">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
              <p
                className="mx-auto max-w-2xl text-xl leading-[1.7] text-slate-300 sm:text-2xl sm:leading-[1.65]"
                style={{ fontFamily: SERIF }}
              >
                {step.body}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 flex shrink-0 flex-col gap-6 px-6 pb-6 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:pb-8 md:px-16">
          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setActive(i)}
                aria-label={`Show ${s.title}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === active
                    ? "w-10 bg-cyan-400"
                    : "w-5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <Link
            to="/team"
            className="group flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-cyan-300 to-cyan-400 px-7 py-3 text-sm font-semibold text-[#070912] shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-200 hover:to-cyan-300 hover:shadow-cyan-400/40 active:scale-[0.98]"
            style={{ fontFamily: SANS }}
          >
            Create a team
            <ChevronRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </footer>
      </div>
    </div>
  );
}