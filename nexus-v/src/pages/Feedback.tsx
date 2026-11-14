import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import StageNav from "../components/StageNav";
import { useMission } from "../state/MissionContext";
import { computeResources } from "../lib/resources";
import { scoreMission, TASK_LABEL, type Grade, type Tone } from "../lib/score";
import { useGlobalKeys } from "../keyboard/KeyboardProvider";
import { MONO, SANS, SERIF } from "../styles/ui";

const eyebrow = "text-[10px] font-medium uppercase tracking-[0.28em] text-cyan-300/80";
const card =
  "rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl";

const GRADE_COLOR: Record<Grade, string> = {
  S: "text-cyan-300",
  A: "text-cyan-300",
  B: "text-emerald-300",
  C: "text-amber-300",
  D: "text-rose-300",
  F: "text-rose-400",
};

const TONE_DOT: Record<Tone, string> = {
  good: "bg-emerald-400",
  bad: "bg-rose-500",
  tip: "bg-amber-400",
};

/** Counts up to `target` so the score feels earned. */
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
    () =>
      result && mission.planet && mission.task
        ? scoreMission(mission, result, computeResources(mission))
        : null,
    [mission, result],
  );

  const shown = useCountUp(score?.total ?? 0);

  const newMission = () => {
    reset();
    navigate("/plan");
  };

  useGlobalKeys({ advance: newMission, canAdvance: () => true });

  // Nothing to show: refreshed the page, or skipped the earlier stages
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
      {/* header */}
      <header className="mx-auto w-full max-w-5xl shrink-0 text-center">
        <p className={eyebrow} style={{ fontFamily: SANS }}>
          Mission debrief · {mission.planet.name} · {TASK_LABEL[mission.task]}
        </p>
        <h1
          className={`mt-1 text-3xl font-semibold tracking-tight sm:text-4xl ${failed ? "text-rose-200" : "text-white"}`}
          style={{ fontFamily: SERIF }}
        >
          {score.outcomeLabel}
        </h1>
      </header>

      {/* content scrolls inside, scrollbar hidden */}
      <div className="mx-auto mt-5 min-h-0 w-full max-w-5xl flex-1 overflow-y-auto overscroll-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
          {/* grade */}
          <div className={`${card} flex flex-col items-center justify-center py-8`}>
            <span
              className={`text-[8rem] font-semibold leading-none ${GRADE_COLOR[score.grade]}`}
              style={{ fontFamily: SERIF }}
              aria-label={`Grade ${score.grade}`}
            >
              {score.grade}
            </span>
            <p className="mt-4 flex items-baseline gap-1 tabular-nums text-white" style={{ fontFamily: MONO }}>
              <span className="text-4xl font-medium tracking-tight">{shown.toLocaleString()}</span>
              <span className="text-sm text-slate-500">/ 1,000</span>
            </p>
          </div>

          {/* categories */}
          <div className={`${card} flex flex-col justify-center gap-4`}>
            {score.categories.map((c) => (
              <div key={c.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-200" style={{ fontFamily: SANS }}>
                    {c.label}
                    <span className="ml-2 text-[11px] font-normal text-slate-500">{c.hint}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400" style={{ fontFamily: MONO }}>
                    {Math.round(c.score)} / {c.max}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/50">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-1000"
                    style={{ width: `${(c.score / c.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* mission facts */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {facts.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500" style={{ fontFamily: SANS }}>
                {k}
              </p>
              <p className="mt-1 text-lg tabular-nums text-white" style={{ fontFamily: MONO }}>
                {v}
              </p>
            </div>
          ))}
        </div>

        {/* debrief */}
        <div className={`${card} mt-4`}>
          <h2 className={eyebrow} style={{ fontFamily: SANS }}>
            Why it went this way
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {score.notes.map((note, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-300" style={{ fontFamily: SANS }}>
                <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${TONE_DOT[note.tone]}`} />
                <span>{note.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* decisions */}
        {result.decisions.length > 0 && (
          <div className={`${card} mt-4`}>
            <h2 className={eyebrow} style={{ fontFamily: SANS }}>
              Your decisions in flight
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {result.decisions.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white" style={{ fontFamily: SANS }}>
                      {d.title}: <span className="font-normal text-slate-300">{d.choice}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400" style={{ fontFamily: SANS }}>
                      {d.text}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs ${
                      d.quality >= 0.8 ? "text-emerald-300" : d.quality >= 0.5 ? "text-amber-300" : "text-rose-300"
                    }`}
                    style={{ fontFamily: MONO }}
                  >
                    {d.quality >= 0.8 ? "Good" : d.quality >= 0.5 ? "Okay" : "Poor"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* footer: the last stage, so no next chevron */}
      <StageNav>
        <button
          onClick={newMission}
          className="group inline-flex items-center gap-2 bg-white/10 px-10 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-xl transition [clip-path:polygon(14px_0,100%_0,calc(100%-14px)_100%,0_100%)] hover:bg-white/20"
          style={{ fontFamily: SANS }}
        >
          Start new mission
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </button>
      </StageNav>
    </section>
  );
}