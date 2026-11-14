import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import StageNav from "../components/StageNav";
import { useMission } from "../state/MissionContext";
import { computeResources } from "../lib/resources";
import { scoreMission, TASK_LABEL, type Grade, type Tone } from "../lib/score";
import { useGlobalKeys } from "../keyboard/KeyboardProvider";

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';

const eyebrow = "text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400";
const card = "border border-white/20 bg-black/40 p-5";

const GRADE_COLOR: Record<Grade, string> = { S: "text-cyan-300", A: "text-cyan-300", B: "text-emerald-300", C: "text-amber-300", D: "text-rose-300", F: "text-rose-400" };
const TONE_DOT: Record<Tone, string> = { good: "bg-emerald-400", bad: "bg-rose-500", tip: "bg-amber-400" };

function useCountUp(target: number, ms = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export default function Feedback() {
  const navigate = useNavigate();
  const { mission, reset } = useMission();
  const result = mission.result;

  const score = useMemo(
    () => result && mission.planet && mission.task ? scoreMission(mission, result, computeResources(mission)) : null,
    [mission, result]
  );

  const shown = useCountUp(score?.total ?? 0);

  const newMission = () => {
    reset();
    navigate("/plan");
  };

  useGlobalKeys({ advance: newMission, canAdvance: () => true });

  if (!mission.planet || !mission.task) return <Navigate to="/plan" replace />;
  if (!result || !score) return <Navigate to="/launch" replace />;

  const failed = result.outcome !== "complete";

  const facts: [string, string][] = [
    ["Spacecraft health", `${Math.round(result.health)}%`],
    ["Reserve left", `$${Math.round(result.reserve).toLocaleString()}M`],
    ["Data returned", `${Math.round(100 - result.dataLoss)}%`],
    ["Propellant left", `${Math.round(result.fuelLeft * 100)}%`],
    ["Events handled", String(result.eventsHit)],
  ];

  return (
    <section className="flex h-full flex-col overflow-hidden px-6 pb-4 pt-6">
      <header className="mx-auto w-full max-w-5xl shrink-0 text-center">
        <p className={eyebrow} style={{ fontFamily: MONO }}>
          Mission debrief · {mission.planet.name} · {TASK_LABEL[mission.task]}
        </p>
        <h1 className={`mt-2 text-3xl font-semibold tracking-tight sm:text-4xl ${failed ? "text-rose-200" : "text-white"}`} style={{ fontFamily: SERIF }}>
          {score.outcomeLabel}
        </h1>
      </header>

      <div className="mx-auto mt-6 min-h-0 w-full max-w-5xl flex-1 overflow-y-auto overscroll-contain pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <div className={`${card} flex flex-col items-center justify-center py-8 relative`}>
            <div className="absolute -left-[1px] -top-[1px] size-3 border-l-2 border-t-2 border-cyan-400" />
            <div className="absolute -right-[1px] -top-[1px] size-3 border-r-2 border-t-2 border-cyan-400" />
            <div className="absolute -bottom-[1px] -left-[1px] size-3 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute -bottom-[1px] -right-[1px] size-3 border-b-2 border-r-2 border-cyan-400" />
            <span className={`text-[8rem] font-semibold leading-none ${GRADE_COLOR[score.grade]}`} style={{ fontFamily: SERIF }} aria-label={`Grade ${score.grade}`}>
              {score.grade}
            </span>
            <p className="mt-4 flex items-baseline gap-1 tabular-nums text-white" style={{ fontFamily: MONO }}>
              <span className="text-4xl font-medium tracking-tight">{shown.toLocaleString()}</span>
              <span className="text-sm text-slate-500">/ 1,000</span>
            </p>
          </div>

          <div className={`${card} flex flex-col justify-center gap-5`}>
            {score.categories.map((c) => (
              <div key={c.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-200" style={{ fontFamily: SERIF }}>
                    {c.label} <span className="ml-2 text-[11px] font-normal text-slate-500" style={{ fontFamily: MONO }}>{c.hint}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400" style={{ fontFamily: MONO }}>{Math.round(c.score)} / {c.max}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden bg-black/50">
                  <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${(c.score / c.max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {facts.map(([k, v]) => (
            <div key={k} className="border border-white/20 bg-black/40 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500" style={{ fontFamily: MONO }}>{k}</p>
              <p className="mt-1 text-lg tabular-nums text-white" style={{ fontFamily: MONO }}>{v}</p>
            </div>
          ))}
        </div>

        <div className={`${card} mt-4`}>
          <h2 className={eyebrow} style={{ fontFamily: MONO }}>Why it went this way</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {score.notes.map((note, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-300" style={{ fontFamily: MONO }}>
                <span aria-hidden className={`mt-1.5 size-2 shrink-0 ${TONE_DOT[note.tone]}`} />
                <span>{note.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {result.decisions.length > 0 && (
          <div className={`${card} mt-4`}>
            <h2 className={eyebrow} style={{ fontFamily: MONO }}>Your decisions in flight</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {result.decisions.map((d, i) => (
                <li key={i} className="flex items-start justify-between gap-4 border border-white/10 bg-black/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white" style={{ fontFamily: MONO }}>
                      {d.title}: <span className="font-normal text-slate-300">{d.choice}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400" style={{ fontFamily: MONO }}>{d.text}</p>
                  </div>
                  <span className={`shrink-0 text-xs ${d.quality >= 0.8 ? "text-emerald-300" : d.quality >= 0.5 ? "text-amber-300" : "text-rose-300"}`} style={{ fontFamily: MONO }}>
                    {d.quality >= 0.8 ? "Good" : d.quality >= 0.5 ? "Okay" : "Poor"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="shrink-0 pt-4">
        <StageNav>
          <button onClick={newMission} className="group inline-flex items-center gap-2 border border-cyan-400/50 bg-cyan-400/10 px-10 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300 transition hover:bg-cyan-400/20" style={{ fontFamily: MONO }}>
            Start new mission
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </button>
        </StageNav>
      </div>
    </section>
  );
}