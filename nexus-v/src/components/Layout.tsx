import { Outlet, useLocation } from "react-router-dom";
import { STAGES } from "../stages";

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

export default function Layout() {
  const { pathname } = useLocation();
  const index = STAGES.findIndex((s) => s.path === pathname);
  const stage = STAGES[index];

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden bg-[#05070a] text-slate-100 selection:bg-cyan-400/30"
      style={{ fontFamily: MONO }}
    >
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

      <header className="relative z-10 flex items-start justify-between px-4 pt-4 sm:px-6 sm:pt-6">
        {/* Brand - Pixel/Cyber Style */}
        <span
          className="border border-cyan-400/30 bg-[#05070a] px-6 py-2.5 text-lg font-bold tracking-widest text-white uppercase shadow-[0_0_15px_rgba(34,211,238,0.15)]"
        >
          Nexus<span className="text-cyan-400">V</span>
        </span>

        {/* Stage Chrome */}
        <span className="flex items-center gap-3 border border-cyan-400/30 bg-[#05070a] px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <span className="size-2 animate-pulse bg-cyan-400" />
          {stage?.label}
          <span className="text-cyan-400/50">
            [{index + 1}/{STAGES.length}]
          </span>
        </span>
      </header>

      {/* Main Viewport with Corner Brackets */}
      <main className="relative z-10 m-4 mt-3 min-h-0 flex-1 overflow-hidden border border-white/20 bg-[#0b0f19]/80 shadow-2xl shadow-black/80 backdrop-blur-md sm:m-6 sm:mt-4">
        {/* Top Left */}
        <div className="pointer-events-none absolute -left-[1px] -top-[1px] z-50 size-4 border-l-2 border-t-2 border-cyan-400" />
        {/* Top Right */}
        <div className="pointer-events-none absolute -right-[1px] -top-[1px] z-50 size-4 border-r-2 border-t-2 border-cyan-400" />
        {/* Bottom Left */}
        <div className="pointer-events-none absolute -bottom-[1px] -left-[1px] z-50 size-4 border-b-2 border-l-2 border-cyan-400" />
        {/* Bottom Right */}
        <div className="pointer-events-none absolute -bottom-[1px] -right-[1px] z-50 size-4 border-b-2 border-r-2 border-cyan-400" />
        
        <Outlet />
      </main>
    </div>
  );
}