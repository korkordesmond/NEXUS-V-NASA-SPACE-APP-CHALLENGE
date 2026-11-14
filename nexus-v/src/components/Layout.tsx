import { Outlet, useLocation } from "react-router-dom";
import { STAGES } from "../stages";

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const SANS  = "Inter, ui-sans-serif, system-ui, sans-serif";

export default function Layout() {
  const { pathname } = useLocation();
  const index = STAGES.findIndex((s) => s.path === pathname);
  const stage = STAGES[index];

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden bg-[#05070d] text-slate-100"
      style={{ fontFamily: SANS }}
    >
      {/* background glows */}
      <div className="pointer-events-none absolute -left-40 -top-40 size-128 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-32 size-120 rounded-full bg-cyan-500/20 blur-3xl" />

      <header className="relative z-10 flex items-start justify-between px-4 pt-4">
        {/* brand — serif, sentence-case, cyan V to echo the Landing wordmark */}
        <span
          className="rounded-tl-xl bg-white/10 py-2.5 pl-6 pr-10 text-lg font-semibold tracking-tight backdrop-blur-xl [clip-path:polygon(0_0,100%_0,calc(100%-18px)_100%,0_100%)]"
          style={{ fontFamily: SERIF }}
        >
          Nexus<span className="text-cyan-300">V</span>
        </span>

        {/* stage chrome — Inter, uppercase tracking, kept technical */}
        <span className="flex items-center gap-3 rounded-tr-xl bg-white/10 py-2.5 pl-10 pr-6 text-xs font-medium uppercase tracking-widest text-slate-300 backdrop-blur-xl [clip-path:polygon(18px_0,100%_0,100%_100%,0_100%)]">
          <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
          {stage?.label}
          <span className="tabular-nums text-slate-500">
            {index + 1}/{STAGES.length}
          </span>
        </span>
      </header>

      <main className="relative z-10 m-4 mt-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/5 backdrop-blur-xl">
        <Outlet />
      </main>
    </div>
  );
}