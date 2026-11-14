/**
 * Scoring and debrief for a finished mission.
 *
 * Pure functions: no React. Feedback.tsx calls scoreMission() and renders the
 * result. The weights below are game balance, not published figures, so tune
 * them freely.
 *
 *   Objective              300   did the spacecraft complete the mission?
 *   Science return         250   how much useful data came home
 *   Resource efficiency    200   reserve, propellant and margins used well
 *   Reliability & decisions 150  spacecraft health and in-flight choices
 *   Launch & delivery      100   got off the pad and reached the target
 *                         ----
 *                         1000
 */
import type { computeResources } from "./resources";
import type { Mission } from "../state/MissionContext";
import type { FlightResult } from "../data/events";
import type { Task } from "../data/mission";

export type Resource = ReturnType<typeof computeResources>[number];
export type Tone = "good" | "bad" | "tip";
export type Note = { tone: Tone; text: string };
export type Grade = "S" | "A" | "B" | "C" | "D" | "F";
export type Category = { key: string; label: string; score: number; max: number; hint: string };
export type Score = {
  categories: Category[];
  total: number;
  grade: Grade;
  outcomeLabel: string;
  notes: Note[];
};

export const TASK_LABEL: Record<Task, string> = {
  flyby: "Flyby",
  orbit: "Orbit",
  land: "Landing",
  return: "Orbit and return",
};

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const pct = (v: number) => Math.round(v * 100);

/** 1 inside [lo, hi], falling off outside it. Negative values score 0. */
const band = (v: number, lo: number, hi: number) =>
  v < 0 ? 0 : v < lo ? v / lo : v <= hi ? 1 : Math.max(0.5, 1 - (v - hi));

/** Science is worth more for harder missions, and longer orbits collect more. */
function taskFactor(task: Task, orbitDays: number) {
  switch (task) {
    case "flyby":
      return 0.55;
    case "orbit":
      return 0.7 + 0.3 * clamp(orbitDays / 90);
    case "land":
      return 0.85;
    case "return":
      return 1;
  }
}

function gradeFor(total: number): Grade {
  return total >= 880 ? "S" : total >= 780 ? "A" : total >= 640 ? "B" : total >= 500 ? "C" : total >= 350 ? "D" : "F";
}

export function scoreMission(mission: Mission, r: FlightResult, resources: Resource[]): Score {
  const task: Task = mission.task ?? "orbit";
  const completed = r.outcome === "complete";
  const launched = r.outcome !== "launch";
  const dataKept = 1 - r.dataLoss / 100;
  const factor = taskFactor(task, mission.orbitDays);

  /* ── category scores ── */
  const objective = completed ? 300 : launched ? 150 * r.progress : 0;

  const science = completed
    ? 250 * factor * dataKept
    : launched
      ? 250 * factor * dataKept * r.progress * 0.3
      : 0;

  // Efficiency: reserve left, propellant left, and margin on the other limits
  const reserveFrac = mission.budget > 0 ? clamp(r.reserve / mission.budget) : 0;
  const others = resources.filter((x) => x.key !== "fuel" && x.key !== "budget" && x.limit > 0);
  const marginScore = others.length
    ? others.reduce((t, x) => t + band(1 - x.used / x.limit, 0.1, 0.45), 0) / others.length
    : 0.7;
  const efficiency = launched ? band(reserveFrac, 0.1, 0.3) * 80 + band(r.fuelLeft, 0.05, 0.35) * 60 + marginScore * 60 : 0;

  // Reliability: health plus the quality of the choices made during events
  const decAvg = r.decisions.length ? r.decisions.reduce((t, d) => t + d.quality, 0) / r.decisions.length : 0.75;
  const reliability = launched ? (r.health / 100) * 60 + decAvg * 90 : 0;

  const launch = (launched ? 40 : 0) + (completed ? 60 : launched ? 60 * r.progress : 0);

  const categories: Category[] = [
    { key: "objective", label: "Objective", score: objective, max: 300, hint: "Did the spacecraft complete its mission?" },
    { key: "science", label: "Science return", score: science, max: 250, hint: "How much useful data came home" },
    { key: "efficiency", label: "Resource efficiency", score: efficiency, max: 200, hint: "Reserve, propellant and margins used well" },
    { key: "reliability", label: "Reliability & decisions", score: reliability, max: 150, hint: "Spacecraft health and in-flight choices" },
    { key: "launch", label: "Launch & delivery", score: launch, max: 100, hint: "Got off the pad and reached the target" },
  ];
  const total = Math.round(categories.reduce((t, c) => t + c.score, 0));
  const grade = launched ? gradeFor(total) : "F";

  const outcomeLabel =
    r.outcome === "launch"
      ? "Launch failure"
      : r.outcome === "fuel"
        ? "Out of propellant"
        : r.outcome === "health"
          ? "Spacecraft lost"
          : total >= 880
            ? "Exceptional success"
            : total >= 500
              ? "Mission success"
              : "Barely made it";

  return { categories, total, grade, outcomeLabel, notes: debrief(mission, r, resources, task, reliabilityNote(r)) };
}

/** "1 in N launches fails", guarded against reliability of 1. */
function reliabilityNote(r: FlightResult) {
  const failRate = 1 - r.launchReliability;
  return {
    pct: pct(r.launchReliability),
    oneIn: failRate > 0 ? Math.round(1 / failRate) : Infinity,
  };
}

/* ─────────── Plain-language debrief ─────────── */

function debrief(
  mission: Mission,
  r: FlightResult,
  resources: Resource[],
  task: Task,
  rel: { pct: number; oneIn: number },
): Note[] {
  const n: Note[] = [];
  const good = (text: string) => n.push({ tone: "good", text });
  const bad = (text: string) => n.push({ tone: "bad", text });
  const tip = (text: string) => n.push({ tone: "tip", text });

  const planet = mission.planet?.name ?? "the target";
  const launcher = mission.parts.launch?.name ?? "Your launch vehicle";

  /* How it ended */
  if (r.outcome === "launch") {
    bad(
      `The rocket failed during ascent. ${launcher} works about ${rel.pct}% of the time${
        isFinite(rel.oneIn) ? `, so roughly 1 in ${rel.oneIn} launches is lost` : ""
      }. Nothing in your design could have prevented it.`,
    );
    tip("Real agencies pick vehicles with long track records for one-of-a-kind spacecraft. Fly the same design again: it was never tested in space.");
    return n;
  }

  if (r.outcome === "fuel") {
    const fuel = resources.find((x) => x.key === "fuel");
    const have = fuel && fuel.used > 0 && fuel.limit > 0 ? pct(fuel.limit / fuel.used) : null;
    bad(
      `Propellant ran out ${pct(r.progress)}% of the way through the mission, during "${r.stageReached}".${
        have !== null ? ` Your propulsion stage carried about ${have}% of what this trip to ${planet} needs.` : ""
      }`,
    );
    tip(
      task === "flyby"
        ? "Even a flyby needs course corrections. Choose a more efficient engine or a lighter payload."
        : "Orbit, landing and return missions need braking burns on top of the trip itself. Choose a more efficient engine or a lighter payload.",
    );
  } else if (r.outcome === "health") {
    bad(`Accumulated damage from in-flight problems ended the mission during "${r.stageReached}".`);
    tip("When an event offers a safer option, the few million dollars it costs are cheaper than losing the spacecraft. Keep 10–20% of the budget in reserve.");
  } else {
    good(`Your spacecraft reached ${planet} and completed the ${TASK_LABEL[task].toLowerCase()}.`);
  }

  /* Science data */
  if (r.outcome === "complete" || r.outcome === "fuel" || r.outcome === "health") {
    if (r.dataLoss === 0) good("All of your science data came home.");
    else if (r.dataLoss <= 10) good(`${pct(1 - r.dataLoss / 100)}% of your science data came home.`);
    else if (r.dataLoss <= 25) tip(`${Math.round(r.dataLoss)}% of the science data was lost to in-flight problems.`);
    else bad(`${Math.round(r.dataLoss)}% of the science data was lost, which cut your science return sharply.`);
  }

  /* Money */
  if (r.reserve < 0) {
    bad(`You finished $${Math.round(-r.reserve)}M over budget. In-flight fixes cost more than the reserve held.`);
  } else if (mission.budget > 0) {
    const f = r.reserve / mission.budget;
    if (f > 0.3) tip(`You finished with $${Math.round(r.reserve)}M unspent (${pct(f)}% of the budget). Some of it could have bought better parts.`);
    else if (f >= 0.1) good(`You kept $${Math.round(r.reserve)}M in reserve, enough to handle surprises.`);
    else tip(`Only ${pct(f)}% of the budget was left in reserve. Real projects hold 10–30% because something always goes wrong.`);
  }

  /* Fuel and margins (only when it did not already fail on them) */
  if (r.outcome === "complete") {
    if (r.fuelLeft < 0.05) tip("You arrived with almost no propellant left. One more correction burn would have ended the mission.");
    else if (r.fuelLeft > 0.6) tip(`${pct(r.fuelLeft)}% of your propellant was never used. A smaller, cheaper stage could have done the job.`);
  }
  const mass = resources.find((x) => x.key === "mass");
  if (mass && mass.limit > 0 && 1 - mass.used / mass.limit > 0.6) {
    tip(`The spacecraft used only ${pct(mass.used / mass.limit)}% of what ${launcher} can lift toward ${planet}. A smaller, cheaper rocket might have worked.`);
  }

  /* Decisions */
  if (r.decisions.length === 0) {
    tip("Nothing went wrong this time. Real missions always meet surprises, so keep a reserve for the next one.");
  } else {
    const best = [...r.decisions].sort((a, b) => b.quality - a.quality)[0];
    if (best.quality >= 0.8) good(`Good call during "${best.title}": ${best.choice.toLowerCase()}. ${best.text}`);
    const worst = [...r.decisions].sort((a, b) => a.quality - b.quality)[0];
    if (worst.quality < 0.5) tip(`In hindsight, "${worst.choice}" during "${worst.title}" cost you. ${worst.text}`);
  }

  return n;
}