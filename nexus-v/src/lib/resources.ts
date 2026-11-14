import type { Mission } from "../state/MissionContext";
import {
  TASKS,
  formatDays,
  launchCapacity,
  lightMinutes,
  sectionsFor,
  sunlightRatio,
  type Part,
} from "../data/mission";

export const G0 = 9.80665; // m/s²

// Spacecraft bus: structure, harness, thermal, attitude control and the computer.
// In ESA study budgets these were roughly half of dry mass, so this is a simplification.
export const BUS_MASS = 0.35; // extra mass on top of the chosen hardware
export const BUS_COST = 0.3; // extra cost on top of the chosen hardware
export const BUS_POWER = 60; // W

export const COURSE_CORRECTION_DV = 0.1; // km/s of trajectory corrections
export const CRUISE_OPS_COST = 0.1; // $M per day (Cassini: ~$704M over ~20 years)
export const SURFACE_OPS_COST = 0.44; // $M per day (Perseverance: ~$300M over 687 days)
export const SURFACE_DAYS = 687; // one Mars year of surface operations
export const RETURN_CAPSULE = { mass: 50, cost: 60 }; // Earth-entry capsule (my estimate)

export type Status = "ok" | "warn" | "over" | "pending";

export interface Resource {
  // "fuel" is read by score.ts and Launch.tsx; computeResources does not emit it yet,
  // so those lookups simply return undefined and are guarded.
  key: "budget" | "mass" | "power" | "dv" | "comms" | "fuel";
  label: string;
  unit: string;
  used: number;
  limit: number;
  status: Status;
  caption: string;
}

type Scope = Pick<Mission, "planet" | "task" | "orbitDays">;

const sum = (list: Part[], pick: (p: Part) => number) =>
  list.reduce((t, p) => t + pick(p), 0);

const level = (used: number, limit: number): Status =>
  used > limit ? "over" : limit > 0 && used / limit >= 0.85 ? "warn" : "ok";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function equippedList(parts: Mission["parts"]): Part[] {
  return Object.values(parts).filter((p): p is Part => p !== undefined);
}

/* ─────────── time and money ─────────── */

export function schedule(m: Scope) {
  const { planet, task, orbitDays } = m;
  if (!planet || !task) return { cruise: 0, onSite: 0, total: 0 };

  const cruise = task === "return" ? 2 * planet.travelDays : planet.travelDays;
  const onSite =
    task === "orbit"
      ? orbitDays
      : task === "land"
        ? SURFACE_DAYS
        : task === "return"
          ? planet.returnWaitDays
          : 0;

  return { cruise, onSite, total: cruise + onSite };
}

export function opsCost(m: Scope): number {
  const { cruise, onSite } = schedule(m);
  return (
    cruise * CRUISE_OPS_COST +
    onSite * (m.task === "land" ? SURFACE_OPS_COST : CRUISE_OPS_COST)
  );
}

// Marginal cost of adding or replacing a part.
// Launch vehicles have no spacecraft bus cost.
export const partCost = (p: Part) =>
  p.section === "launch" ? p.cost : p.cost * (1 + BUS_COST);

export function totalCost(m: Mission): number {
  const parts = equippedList(m.parts);

  // Launch vehicles are separate from the spacecraft bus.
  const launchCost = sum(
    parts.filter((p) => p.section === "launch"),
    (p) => p.cost
  );

  // All other hardware shares one spacecraft bus.
  const hardwareCost = sum(
    parts.filter((p) => p.section !== "launch"),
    (p) => p.cost
  );

  // The return capsule is also part of the spacecraft.
  const capsuleCost =
    m.task === "return" ? RETURN_CAPSULE.cost : 0;

  const spacecraftCost =
    (hardwareCost + capsuleCost) * (1 + BUS_COST);

  return Math.round(launchCost + spacecraftCost + opsCost(m));
}

/* ─────────── mass and delta-v ─────────── */

export function craftMass(m: Mission) {
  const hardware =
    sum(
      equippedList(m.parts).filter((p) => p.section !== "launch"),
      (p) => p.mass
    ) + (m.task === "return" ? RETURN_CAPSULE.mass : 0);

  const dry = Math.round(hardware * (1 + BUS_MASS));
  const propellant = m.parts.propulsion?.propellant ?? 0;
  return { dry, propellant, wet: dry + propellant };
}

export function requiredDv(m: Pick<Mission, "planet" | "task">): number {
  const { planet, task } = m;
  if (!planet || !task) return 0;

  let dv = COURSE_CORRECTION_DV;
  if (task === "orbit") dv += planet.captureDv;
  if (task === "return") dv += 2 * planet.captureDv; // brake in, then leave again
  if (task === "land" && !planet.hasAtmosphere) {
    dv += planet.captureDv + planet.landingDv;
  }

  return round2(dv);
}

// The rocket equation: how much speed change the chosen stage can deliver.
export function availableDv(m: Mission): number {
  const stage = m.parts.propulsion;
  if (!stage?.isp || !stage.propellant) return 0;

  const { dry, wet } = craftMass(m);
  if (dry <= 0) return 0;

  return round2((stage.isp * G0 * Math.log(wet / dry)) / 1000);
}

/* ─────────── power ─────────── */

export function powerBalance(m: Mission) {
  const list = equippedList(m.parts);
  const sun = m.planet ? sunlightRatio(m.planet) : 1;

  const supply = sum(list, (p) =>
    p.power > 0 ? (p.solar ? p.power * sun : p.power) : 0
  );

  const demand =
    BUS_POWER + sum(list, (p) => (p.power < 0 ? -p.power : 0));

  return { supply: Math.round(supply), demand: Math.round(demand) };
}

/* ─────────── the five limits ─────────── */

export function computeResources(m: Mission): Resource[] {
  const { launch, power, comms, propulsion } = m.parts;
  const planetName = m.planet?.name ?? "target";

  const { dry, propellant, wet } = craftMass(m);
  const capacity = launchCapacity(launch, m.planet);
  const { supply, demand } = powerBalance(m);
  const needDv = requiredDv(m);
  const haveDv = availableDv(m);
  const farthest = m.planet ? round2(m.planet.distanceAU + 1) : 0;
  const reach = comms?.reachAU ?? 0;
  const spent = totalCost(m);

  return [
    {
      key: "budget",
      label: "Budget",
      unit: "$M",
      used: spent,
      limit: m.budget,
      status: level(spent, m.budget),
      caption: "parts, bus and operations / your budget",
    },
    {
      key: "mass",
      label: "Mass",
      unit: "kg",
      used: wet,
      limit: capacity,
      status: launch ? level(wet, capacity) : "pending",
      caption: launch
        ? `dry ${dry.toLocaleString()} + propellant ${propellant.toLocaleString()} / launch limit for ${planetName}`
        : "choose a launch vehicle",
    },
    {
      key: "power",
      label: "Power",
      unit: "W",
      used: demand,
      limit: supply,
      status: power ? level(demand, supply) : "pending",
      caption: power
        ? `demand / supply at ${planetName}`
        : "choose a power system",
    },
    {
      key: "dv",
      label: "Delta-v",
      unit: "km/s",
      used: needDv,
      limit: haveDv,
      status: propulsion ? level(needDv, haveDv) : "pending",
      caption: propulsion
        ? "needed for the trip / your stage can give"
        : "choose a propulsion stage",
    },
    {
      key: "comms",
      label: "Comms",
      unit: "AU",
      used: farthest,
      limit: reach,
      status: comms ? level(farthest, reach) : "pending",
      caption: m.planet
        ? `farthest Earth distance / antenna reach · delay up to ${lightMinutes(m.planet)} min`
        : "choose an antenna",
    },
  ];
}

export function isReady(m: Mission, resources: Resource[]): boolean {
  const complete = sectionsFor(m.task).every((s) => !!m.parts[s.id]);
  return complete && resources.every((r) => r.status === "ok" || r.status === "warn");
}

export function missionSummary(m: Mission): string {
  if (!m.planet || !m.task) return "";

  const task = TASKS.find((t) => t.id === m.task)?.short ?? "";
  return `${m.planet.name} · ${task} · ${formatDays(schedule(m).total)}`;
}