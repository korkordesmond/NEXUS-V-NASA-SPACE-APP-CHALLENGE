import { useEffect, useState } from "react";
import { MissionProvider } from "./state/MissionContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import CreateTeam from "./pages/CreateTeam";
import JoinTeam from "./pages/JoinTeam";
import Plan from "./pages/Plan";
import Build from "./pages/Build";
import Launch from "./pages/Launch";
import Feedback from "./pages/Feedback";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

/* Phones held upright: portrait, narrow, and a touch screen.
   Tablets (768px and wider) and desktop windows are never blocked. */
const PORTRAIT_PHONE = "(orientation: portrait) and (max-width: 767px) and (pointer: coarse)";

function useIsPortraitPhone() {
  const [blocked, setBlocked] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(PORTRAIT_PHONE).matches
      : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(PORTRAIT_PHONE);
    const onChange = () => setBlocked(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return blocked;
}

/* Covers the whole screen while the phone is upright. The app stays mounted
   underneath, so nothing resets (lobby, mission, flight) when the phone turns. */
function RotateGate() {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Rotate your device"
      className="rg-fade fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 overflow-hidden bg-[#05070a] p-8 text-center text-slate-100"
      style={{ fontFamily: MONO }}
    >
      {/* Drifting pixel grid */}
      <div
        className="rg-grid pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 80%)",
        }}
      />
      {/* Scanline sweep */}
      <div
        className="rg-scan pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Icon: pulse rings, a drawing arrow, and a phone that turns sideways */}
        <div className="relative flex size-32 items-center justify-center">
          <span className="rg-ring absolute inset-0 border border-cyan-400/50" />
          <span className="rg-ring rg-ring-2 absolute inset-0 border border-cyan-400/30" />

          <svg viewBox="0 0 96 96" fill="none" className="absolute inset-0 size-full text-cyan-400" aria-hidden="true">
            {/* arrow arc around the phone */}
            <path
              className="rg-arc"
              d="M18 30 A38 38 0 0 1 78 22"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="square"
              pathLength={1}
            />
            <path className="rg-arrow" d="M70 14 L79 22 L69 28" stroke="currentColor" strokeWidth={2} strokeLinecap="square" />
          </svg>

          <svg
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="square"
            strokeLinejoin="miter"
            className="rg-phone relative size-16 text-cyan-300"
            aria-hidden="true"
          >
            <rect x="20" y="6" width="24" height="52" />
            <path d="M28 12h8" />
            <rect x="24" y="18" width="16" height="26" fill="currentColor" opacity={0.15} stroke="none" />
            <circle cx="32" cy="51" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <p className="rg-up text-xs uppercase tracking-[0.3em] text-cyan-500" style={{ animationDelay: "0.1s" }}>
          Display.Check
        </p>
        <h1 className="rg-up text-2xl font-bold uppercase tracking-widest text-white" style={{ animationDelay: "0.25s" }}>
          Nexus<span className="text-cyan-400">V</span>
        </h1>
        <p className="rg-up max-w-[18rem] text-sm leading-relaxed text-slate-300" style={{ animationDelay: "0.4s" }}>
          &gt; ROTATE YOUR PHONE TO LANDSCAPE TO CONTINUE.<span className="rg-cursor ml-1 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-cyan-400" />
        </p>
        <p className="rg-up max-w-[18rem] text-xs text-slate-500" style={{ animationDelay: "0.55s" }}>
          If it does not turn, switch off your phone&apos;s rotation lock.
        </p>
      </div>

      <style>{`
        .rg-fade { animation: rg-fade .35s ease-out both; }
        .rg-up { opacity: 0; animation: rg-up .6s ease-out forwards; }
        .rg-grid { animation: rg-grid 6s linear infinite; }
        .rg-scan { animation: rg-scan 3.2s linear infinite; }
        .rg-ring { animation: rg-ring 2.4s ease-out infinite; }
        .rg-ring-2 { animation-delay: 1.2s; }
        .rg-phone { display: block; transform-box: fill-box; transform-origin: center; will-change: transform; animation: rg-phone 3s cubic-bezier(.6,0,.3,1) infinite; }
        .rg-arc { stroke-dasharray: 1; stroke-dashoffset: 1; animation: rg-arc 3s ease-in-out infinite; }
        .rg-arrow { opacity: 0; animation: rg-arrow 3s ease-in-out infinite; }
        .rg-cursor { animation: rg-blink 1s steps(1) infinite; }

        @keyframes rg-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rg-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes rg-grid { from { background-position: 0 0; } to { background-position: 40px 40px; } }
        @keyframes rg-scan { from { transform: translateY(-6rem); } to { transform: translateY(100vh); } }
        @keyframes rg-ring { 0% { transform: scale(.55); opacity: .9; } 100% { transform: scale(1.15); opacity: 0; } }
        @keyframes rg-phone {
          0%, 15% { transform: rotate(0deg); }
          50%, 80% { transform: rotate(-90deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes rg-arc { 0%, 10% { stroke-dashoffset: 1; } 50%, 85% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 1; } }
        @keyframes rg-arrow { 0%, 45% { opacity: 0; } 55%, 85% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes rg-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

        /* Reduced motion: drop the decorative effects but keep the rotating phone,
           because that is the instruction itself. */
        @media (prefers-reduced-motion: reduce) {
          .rg-grid, .rg-scan, .rg-ring, .rg-cursor, .rg-fade { animation: none; }
          .rg-up { animation: none; opacity: 1; }
          .rg-ring, .rg-scan { display: none; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const mustRotate = useIsPortraitPhone();

  /* Best effort: some Android browsers allow locking to landscape. Most need
     fullscreen first, so failures are ignored and the overlay does the job. */
  useEffect(() => {
    const lock = (screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    }).lock;
    lock?.call(screen.orientation, "landscape").catch(() => {});
  }, []);

  return (
    <MissionProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/team" element={<CreateTeam />} />

          {/* The invite link route! */}
          <Route path="/join/:code" element={<JoinTeam />} />

          {/* Mission Routes wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="/plan" element={<Plan />} />
            <Route path="/build" element={<Build />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/feedback" element={<Feedback />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {mustRotate && <RotateGate />}
    </MissionProvider>
  );
}