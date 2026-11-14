import { useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import StageNav from "../components/StageNav";
import { useMission, type Mission } from "../state/MissionContext";
import { partStats, partsFor, sectionsFor, type Part, type Planet, type Section, type SectionInfo } from "../data/mission";
import { computeResources, isReady, missionSummary, partCost, totalCost, type Resource, type Status } from "../lib/resources";
import { useArrowNav } from "../hooks/useArrowNav";
import { useGlobalKeys } from "../keyboard/KeyboardProvider";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';

const STATUS_BAR: Record<Status, string> = { ok: "bg-cyan-400", warn: "bg-amber-400", over: "bg-rose-500", pending: "bg-white/20" };
const STATUS_TEXT: Record<Status, string> = { ok: "text-slate-200", warn: "text-amber-300", over: "text-rose-400", pending: "text-slate-500" };

const panel = "border border-white/20 bg-black/40 p-4";
const eyebrow = "text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400";
const noScrollbar = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/* ─────────── Left: resources ─────────── */

function ResourcePanel({ resources, summary }: { resources: Resource[]; summary: string }) {
  const alerts = resources.filter((r) => r.status === "warn" || r.status === "over");

  return (
    <aside className={`${panel} flex min-h-0 flex-col overflow-hidden`}>
      <div className="shrink-0">
        <h2 className={eyebrow} style={{ fontFamily: MONO }}>Resources / limits</h2>
        <p className="mt-1 text-sm text-slate-300" style={{ fontFamily: SERIF }}>{summary}</p>
      </div>

      <div className={`mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1 ${noScrollbar}`}>
        {resources.map((r) => {
          const pct = r.limit > 0 ? Math.min(100, (r.used / r.limit) * 100) : r.used > 0 ? 100 : 0;
          return (
            <div key={r.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-slate-300" style={{ fontFamily: MONO }}>{r.label}</span>
                <span className={`text-xs tabular-nums ${STATUS_TEXT[r.status]}`} style={{ fontFamily: MONO }}>
                  {r.used.toLocaleString()} / {r.limit.toLocaleString()} <span className="text-slate-500">{r.unit}</span>
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden bg-black/60">
                <div className={`h-full transition-all duration-500 ${STATUS_BAR[r.status]}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[0.65rem] text-slate-500" style={{ fontFamily: MONO }}>{r.caption}</p>
            </div>
          );
        })}

        {alerts.length > 0 && (
          <div className={`border px-3 py-2 text-xs leading-relaxed ${alerts.some((r) => r.status === "over") ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-amber-400/40 bg-amber-400/10 text-amber-200"}`} style={{ fontFamily: MONO }}>
            {alerts.map((r) => (
              <p key={r.key}>{r.status === "over" ? `${r.label} is over its limit.` : `${r.label} is close to its limit.`}</p>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ─────────── Center: interactive spacecraft ─────────── */

function RocketView({ parts, active, sections, onSelect }: { parts: Mission["parts"]; active: Section; sections: SectionInfo[]; onSelect: (id: Section) => void; }) {
  const has = (s: Section) => !!parts[s];
  const edge = (s: Section) => active === s ? "#22d3ee" : has(s) ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.22)";
  const body = (s: Section) => has(s) ? "url(#hull)" : "rgba(255,255,255,0.04)";
  const dash = (s: Section) => (has(s) ? undefined : "4 4");
  const anyCraft = has("payload") || has("power") || has("comms") || has("propulsion");
  const rtg = has("power") && !parts.power?.solar;
  const hasLander = sections.some((s) => s.id === "lander");

  const selectable = (id: Section) => {
    if (!sections.some((s) => s.id === id)) return {};
    return {
      onClick: () => onSelect(id),
      role: "button", tabIndex: 0,
      className: "cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80",
      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(id); } },
    };
  };

  return (
    <svg viewBox="0 0 160 340" className="h-full w-auto max-h-full" role="img" aria-label="Your spacecraft" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="hull" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#94a3b8" /><stop offset="0.45" stopColor="#f1f5f9" /><stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="flame" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g {...selectable("launch")}>
        <rect x="52" y="246" width="56" height="86" rx="0" fill={body("launch")} stroke={edge("launch")} strokeWidth={2} strokeDasharray={dash("launch")} />
        {has("launch") && <path d="M60 332 H100 L80 340 Z" fill="url(#flame)" className="motion-safe:animate-pulse" />}
      </g>
      <g {...selectable("propulsion")}>
        <path d="M64 224 H96 L106 246 H54 Z" fill={body("propulsion")} stroke={edge("propulsion")} strokeWidth={2} strokeDasharray={dash("propulsion")} />
      </g>
      <g {...selectable("power")}>
        {rtg ? (
          <>
            <line x1="104" y1="167" x2="112" y2="167" stroke={edge("power")} strokeWidth={2} />
            <rect x="112" y="160" width="40" height="14" rx="0" fill="url(#hull)" stroke={edge("power")} strokeWidth={2} />
          </>
        ) : (
          <>
            <g fill={body("power")} stroke={edge("power")} strokeWidth={2} strokeDasharray={dash("power")}>
              <rect x="6" y="146" width="44" height="48" rx="0" />
              <rect x="110" y="146" width="44" height="48" rx="0" />
            </g>
            {has("power") && !rtg && (
              <g stroke="rgba(15,23,42,0.3)" strokeWidth="1.5">
                <line x1="17" y1="146" x2="17" y2="194" /><line x1="28" y1="146" x2="28" y2="194" /><line x1="39" y1="146" x2="39" y2="194" />
                <line x1="121" y1="146" x2="121" y2="194" /><line x1="132" y1="146" x2="132" y2="194" /><line x1="143" y1="146" x2="143" y2="194" />
              </g>
            )}
          </>
        )}
      </g>
      <g {...selectable("payload")}>
        <rect x="56" y="124" width="48" height="100" rx="0" fill={anyCraft ? "url(#hull)" : "rgba(255,255,255,0.04)"} stroke={anyCraft ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.22)"} strokeWidth={2} strokeDasharray={anyCraft ? undefined : "4 4"} />
        {anyCraft && (
          <g stroke="rgba(15,23,42,0.35)" strokeWidth="2">
            <line x1="56" y1="156" x2="104" y2="156" /><line x1="56" y1="192" x2="104" y2="192" />
          </g>
        )}
        <rect x="64" y="84" width="32" height="40" rx="0" fill={body("payload")} stroke={edge("payload")} strokeWidth={2} strokeDasharray={dash("payload")} />
        {has("payload") && <circle cx="80" cy="104" r="7" fill="#0ea5e9" opacity="0.85" />}
      </g>
      <g {...selectable("comms")}>
        <line x1="80" y1="70" x2="80" y2="84" stroke={edge("comms")} strokeWidth={2} />
        <path d="M48 58 Q80 84 112 58 Z" fill={body("comms")} stroke={edge("comms")} strokeWidth={2} strokeDasharray={dash("comms")} />
      </g>
      {hasLander && (
        <g {...selectable("lander")}>
          <g fill={body("lander")} stroke={edge("lander")} strokeWidth={2} strokeDasharray={dash("lander")}>
            <rect x="18" y="204" width="32" height="20" rx="0" />
            <path d="M26 224 L18 238 M42 224 L50 238" fill="none" />
          </g>
        </g>
      )}
    </svg>
  );
}

function SectionTabs({ sections, index, parts, onPick }: { sections: SectionInfo[]; index: number; parts: Mission["parts"]; onPick: (i: number) => void; }) {
  return (
    <div className="grid shrink-0 grid-cols-3 gap-2">
      {sections.map((s, i) => {
        const filled = !!parts[s.id];
        const active = i === index;
        return (
          <button
            key={s.id}
            onClick={() => onPick(i)}
            aria-current={active}
            className={`group relative overflow-hidden border px-3 py-2.5 text-left transition duration-200 ${
              active ? "border-cyan-400/80 bg-cyan-400/10" : filled ? "border-cyan-400/30 bg-white/[0.04] hover:border-cyan-400/50" : "border-white/10 bg-black/40 hover:border-white/25"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`size-1.5 shrink-0 transition ${active ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : filled ? "bg-cyan-400/50" : "bg-white/20"}`} />
              <span className={`truncate text-[0.6rem] font-medium uppercase tracking-[0.18em] transition ${active ? "text-cyan-200" : "text-slate-500 group-hover:text-slate-400"}`} style={{ fontFamily: MONO }}>{s.title}</span>
            </div>
            <span className={`mt-0.5 block truncate text-xs transition ${active ? "text-white" : filled ? "text-slate-200" : "text-slate-500"}`} style={{ fontFamily: MONO }}>{parts[s.id]?.name ?? "Empty"}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────── Right: parts ─────────── */

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex gap-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className={tone ?? "text-slate-300"}>{value}</dd>
    </div>
  );
}

function PartList({ parts, equippedId, hidden, planet, onPick, onClear }: { parts: Part[]; equippedId?: string; hidden: number; planet: Planet | null; onPick: (p: Part) => void; onClear: () => void; }) {
  const ref = useRef<HTMLDivElement>(null);
  useArrowNav(ref, "button", { orientation: "vertical" });

  return (
    <div ref={ref} className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 ${noScrollbar}`}>
      {parts.map((p) => {
        const active = p.id === equippedId;
        return (
          <div key={p.id} className="relative group">
            <button
              onClick={(e) => { onPick(p); e.currentTarget.focus(); }}
              data-advance
              aria-pressed={active}
              className={`w-full border p-3 text-left pr-10 transition ${active ? "border-cyan-400/80 bg-cyan-400/10" : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.04]"}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold tracking-tight text-white" style={{ fontFamily: SERIF }}>{p.name}</span>
                <span className="text-sm tabular-nums text-cyan-300" style={{ fontFamily: MONO }}>{p.est ? "~" : ""}${Math.round(partCost(p)).toLocaleString()}M</span>
              </div>
              <p className="mt-1 text-xs text-slate-400" style={{ fontFamily: MONO }}>{p.blurb}</p>
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] tabular-nums" style={{ fontFamily: MONO }}>
                {partStats(p, planet).map((s) => <Stat key={s.label} label={s.label} value={s.value} tone={s.tone} />)}
              </dl>
            </button>
            {active && (
              <button onClick={(e) => { e.stopPropagation(); onClear(); }} aria-label="Remove component" className="absolute right-2 top-2 grid size-7 place-items-center bg-rose-500/10 text-rose-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="square" strokeLinejoin="miter" /></svg>
              </button>
            )}
          </div>
        );
      })}
      {parts.length === 0 && <p className="text-sm leading-relaxed text-slate-400" style={{ fontFamily: MONO }}>Nothing here fits your remaining budget. Go back to Plan and raise it, or free up money in another section.</p>}
      {hidden > 0 && <p className="px-1 text-[0.7rem] text-slate-500" style={{ fontFamily: MONO }}>{hidden} more {hidden === 1 ? "part is" : "parts are"} hidden because {hidden === 1 ? "it costs" : "they cost"} more than you can spend here.</p>}
    </div>
  );
}

/* ─────────── Page ─────────── */

export default function Build() {
  const navigate = useNavigate();
  const { mission, update } = useMission();
  const [index, setIndex] = useState(0);

  const sections = sectionsFor(mission.task);
  const safeIndex = Math.min(index, sections.length - 1);
  const section = sections[safeIndex];

  const resources = useMemo(() => computeResources(mission), [mission]);
  const equipped = mission.parts[section.id];
  const spendable = mission.budget - (totalCost(mission) - (equipped ? partCost(equipped) : 0));
  const options = partsFor(section.id, mission.planet, mission.task);
  const affordable = options.filter((p) => partCost(p) <= spendable + 0.01 || p.id === equipped?.id);
  const hidden = options.length - affordable.length;

  const ready = isReady(mission, resources);
  const isLast = safeIndex === sections.length - 1;
  const canAdvance = !!equipped && (!isLast || ready);

  const pick = (p: Part) => update({ parts: { ...mission.parts, [section.id]: p } });
  const clear = () => { const nextParts = { ...mission.parts }; delete nextParts[section.id]; update({ parts: nextParts }); };
  const next = () => isLast ? navigate("/launch") : setIndex(safeIndex + 1);
  const prev = () => safeIndex === 0 ? navigate("/plan") : setIndex(safeIndex - 1);

  useGlobalKeys({ advance: next, back: prev, canAdvance: () => canAdvance });

  if (mission.budget <= 0 || !mission.planet || !mission.task) return <Navigate to="/plan" replace />;

  const handleImageSelect = (id: Section) => {
    const targetIndex = sections.findIndex((s) => s.id === id);
    if (targetIndex !== -1) setIndex(targetIndex);
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden px-6 pb-4 pt-4">
      <div className={`grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto py-2 ${noScrollbar} md:grid-cols-[16rem_minmax(0,1fr)_minmax(0,22rem)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden`}>
        <ResourcePanel resources={resources} summary={missionSummary(mission)} />

        <div className="hidden min-h-0 flex-col gap-4 md:flex">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden border border-white/10 bg-black/20">
            <RocketView parts={mission.parts} active={section.id} sections={sections} onSelect={handleImageSelect} />
          </div>
          <SectionTabs sections={sections} index={safeIndex} parts={mission.parts} onPick={setIndex} />
        </div>

        <aside className={`${panel} flex min-h-0 flex-col gap-3 overflow-hidden`}>
          <div className="shrink-0">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className={eyebrow} style={{ fontFamily: MONO }}>{section.title}</h2>
              <span className="text-[0.65rem] tabular-nums text-slate-500" style={{ fontFamily: MONO }}>{safeIndex + 1}/{sections.length}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400" style={{ fontFamily: MONO }}>
              Spend up to <span className="tabular-nums text-slate-200">${Math.max(0, Math.round(spendable)).toLocaleString()}M</span> here.
            </p>
          </div>
          <PartList key={section.id} parts={affordable} equippedId={equipped?.id} hidden={hidden} planet={mission.planet} onPick={pick} onClear={clear} />
        </aside>
      </div>

      <div className="shrink-0 pt-4">
        <StageNav onPrev={prev} onNext={next} nextDisabled={!canAdvance}>
          <button
            onClick={next}
            disabled={!canAdvance}
            className="group inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-400/10 px-10 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ fontFamily: MONO }}
          >
            {isLast ? "Go to launch" : `Next: ${sections[safeIndex + 1].title}`}
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </button>
        </StageNav>
      </div>
    </section>
  );
}