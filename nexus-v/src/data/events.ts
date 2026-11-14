/**
 * Flight events: things that go wrong (or need a decision) during a mission.
 *
 * Every event has at least one choice that costs nothing, so a player with an
 * empty reserve is never stuck. `quality` (0..1) is how good the choice was in
 * hindsight; the Feedback page uses it for the "Reliability & decisions" score.
 *
 * The situations are real ones (solar storms, reaction wheel failures, DSN
 * outages, Jupiter's radiation belts, Mars dust storms). The numbers are game
 * balance, not published figures.
 */

export type Effect = {
  /** $M taken from the reserve */
  cost?: number;
  /** health points lost (negative number) */
  health?: number;
  /** percentage points of science data lost */
  dataLoss?: number;
};

export type Choice = {
  label: string;
  detail: string;
  effect: Effect;
  quality: number;
  /** what happened, shown on the Feedback page */
  outcome: string;
};

export type EventCtx = { planetId: string; task: string; solar: boolean };

export type FlightEvent = {
  id: string;
  phase: "cruise" | "target";
  title: string;
  text: string;
  when?: (c: EventCtx) => boolean;
  choices: Choice[];
};

export type Decision = {
  title: string;
  choice: string;
  quality: number;
  text: string;
};

/** Everything the Feedback page needs. Stored on the mission by Launch. */
export type FlightResult = {
  outcome: "complete" | "fuel" | "health" | "launch";
  /** 0..1 of the planned timeline that was flown */
  progress: number;
  stageReached: string;
  /** 0..100 */
  health: number;
  /** $M left in reserve (can be negative only if the build was already over budget) */
  reserve: number;
  /** $M: build cost plus in-flight fixes */
  spent: number;
  /** 0..100, percent of science data lost */
  dataLoss: number;
  /** 0..1 fraction of propellant left */
  fuelLeft: number;
  decisions: Decision[];
  eventsHit: number;
  /** the launch vehicle's chance of success that was used for the roll */
  launchReliability: number;
};

export const EVENTS: FlightEvent[] = [
  /* ── cruise ── */
  {
    id: "solar-storm",
    phase: "cruise",
    title: "Solar storm incoming",
    text: "A coronal mass ejection will reach the spacecraft in about 18 hours. Energetic particles can corrupt memory and age the electronics.",
    choices: [
      {
        label: "Enter safe mode",
        detail: "Instruments off until the storm passes.",
        effect: { health: -3, dataLoss: 8 },
        quality: 0.85,
        outcome: "Safe mode kept the electronics quiet. A few hours of data were lost.",
      },
      {
        label: "Keep everything running",
        detail: "Keep collecting data.",
        effect: { health: -18 },
        quality: 0.3,
        outcome: "Energetic particles flipped bits in memory and aged the electronics.",
      },
      {
        label: "Point the heavy side at the Sun",
        detail: "Use the structure as shielding. Needs extra ground time.",
        effect: { cost: 3, health: -2, dataLoss: 2 },
        quality: 0.95,
        outcome: "Turning the thickest side to the storm shielded the computer at a small cost.",
      },
    ],
  },
  {
    id: "micrometeoroid",
    phase: "cruise",
    title: "Micrometeoroid strike",
    text: "A sensor registered a tiny impact on the spacecraft body. Telemetry shows a small temperature change near one radiator.",
    choices: [
      {
        label: "Run a full health check",
        detail: "Costs ground-team time.",
        effect: { cost: 2, health: -3 },
        quality: 0.9,
        outcome: "The check found minor damage early and the team worked around it.",
      },
      {
        label: "Turn the antenna away",
        detail: "Protect the dish and carry on.",
        effect: { health: -6, dataLoss: 4 },
        quality: 0.65,
        outcome: "The dish was protected but the radiator damage went unchecked.",
      },
      {
        label: "Ignore it",
        detail: "It is probably nothing.",
        effect: { health: -12 },
        quality: 0.35,
        outcome: "The damaged radiator ran hot for the rest of the mission.",
      },
    ],
  },
  {
    id: "reaction-wheel",
    phase: "cruise",
    title: "Reaction wheel failure",
    text: "One of the wheels that holds the spacecraft steady is drawing too much current and vibrating.",
    choices: [
      {
        label: "Switch to the spare wheel",
        detail: "Needs a careful command sequence.",
        effect: { cost: 5, health: -1 },
        quality: 0.9,
        outcome: "The spare wheel took over and pointing stayed sharp.",
      },
      {
        label: "Hold attitude with thrusters",
        detail: "Works, but is coarse.",
        effect: { health: -6, dataLoss: 3 },
        quality: 0.55,
        outcome: "Thrusters held the spacecraft but pointing was rougher, which blurred some observations.",
      },
      {
        label: "Ignore the warning",
        detail: "Wait and see.",
        effect: { health: -14 },
        quality: 0.25,
        outcome: "The wheel seized. The spacecraft drifted until ground control recovered it.",
      },
    ],
  },
  {
    id: "dsn-outage",
    phase: "cruise",
    title: "Ground station outage",
    text: "A Deep Space Network antenna went down for maintenance during a planned downlink.",
    choices: [
      {
        label: "Request backup station time",
        detail: "Other missions are also waiting.",
        effect: { cost: 4, dataLoss: 3 },
        quality: 0.9,
        outcome: "A backup antenna was booked and almost all the data came home.",
      },
      {
        label: "Wait for the station to return",
        detail: "Data piles up in memory.",
        effect: { dataLoss: 12 },
        quality: 0.6,
        outcome: "The onboard memory filled and some data was overwritten before the next pass.",
      },
    ],
  },
  {
    id: "computer-reset",
    phase: "cruise",
    title: "Computer reset",
    text: "The flight computer rebooted on its own and dropped into safe mode. Commands take a while to arrive, so the team has to decide how to recover.",
    choices: [
      {
        label: "Command a reboot",
        detail: "Quick, but wipes unsent data.",
        effect: { health: -4, dataLoss: 6 },
        quality: 0.7,
        outcome: "A clean reboot restored the computer but cleared some unsent data.",
      },
      {
        label: "Upload a software patch",
        detail: "Slow and needs a test first.",
        effect: { cost: 6, health: -1, dataLoss: 3 },
        quality: 0.9,
        outcome: "The patch fixed the cause, so it did not happen again.",
      },
    ],
  },

  /* ── at the target ── */
  {
    id: "nav-correction",
    phase: "target",
    title: "Final trajectory correction",
    text: "Tracking shows the spacecraft will pass slightly off target. A small burn now fixes it, and a bigger one later would cost far more.",
    choices: [
      {
        label: "Make the correction burn",
        detail: "Small cost in ground time and propellant.",
        effect: { cost: 3 },
        quality: 0.9,
        outcome: "The correction burn put the spacecraft right on target.",
      },
      {
        label: "Skip it",
        detail: "Hope the error stays small.",
        effect: { health: -10, dataLoss: 6 },
        quality: 0.3,
        outcome: "The off-target approach shortened the best observing window.",
      },
    ],
  },
  {
    id: "jupiter-radiation",
    phase: "target",
    title: "Jupiter's radiation belts",
    text: "Jupiter's magnetic field traps intense radiation that can fry unshielded electronics within hours.",
    when: (c) => c.planetId === "jupiter",
    choices: [
      {
        label: "Shut down non-essential electronics",
        detail: "Lose some science during the worst passes.",
        effect: { health: -5, dataLoss: 10 },
        quality: 0.8,
        outcome: "Turning off non-essential systems kept the dose low at the cost of some science.",
      },
      {
        label: "Add shielding procedures",
        detail: "Extra ground work and heater cycling.",
        effect: { cost: 8, health: -3 },
        quality: 0.9,
        outcome: "Careful procedures protected the electronics through the belts.",
      },
      {
        label: "Keep all instruments on",
        detail: "Collect everything.",
        effect: { health: -25 },
        quality: 0.3,
        outcome: "The radiation dose damaged the electronics badly.",
      },
    ],
  },
  {
    id: "dust-storm",
    phase: "target",
    title: "Global dust storm",
    text: "A dust storm is blocking the sunlight that your solar panels depend on.",
    when: (c) => c.planetId === "mars" && c.solar && c.task !== "flyby",
    choices: [
      {
        label: "Cut to essential systems",
        detail: "Keep communications alive, pause most science.",
        effect: { health: -4, dataLoss: 10 },
        quality: 0.8,
        outcome: "Cutting load kept the batteries above their limit until the sky cleared.",
      },
      {
        label: "Hibernate the spacecraft",
        detail: "Minimal power until the sky clears.",
        effect: { health: -2, dataLoss: 20 },
        quality: 0.6,
        outcome: "Hibernating was safe but a lot of science time was lost.",
      },
      {
        label: "Ride it out at full load",
        detail: "Batteries will cover it, probably.",
        effect: { health: -15 },
        quality: 0.3,
        outcome: "The batteries drained deeply and wore out early.",
      },
    ],
  },
  {
    id: "thermal",
    phase: "target",
    title: "Overheating near the Sun",
    text: "Sunlight at this distance is much stronger than at Earth, and one side of the spacecraft is heating up.",
    when: (c) => c.planetId === "mercury" || c.planetId === "venus",
    choices: [
      {
        label: "Rotate the sunshade into place",
        detail: "Instruments lose some viewing time.",
        effect: { health: -3, dataLoss: 6 },
        quality: 0.85,
        outcome: "The sunshade kept temperatures in range.",
      },
      {
        label: "Keep instruments pointed at the planet",
        detail: "Best science, but hot.",
        effect: { health: -15 },
        quality: 0.4,
        outcome: "Sustained heat degraded the electronics and the solar panels.",
      },
    ],
  },
];

/* ── helpers ── */

/** Small seeded random number generator (mulberry32). Returns numbers in [0, 1). */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type ScheduledEvent = { atMs: number; event: FlightEvent };

/**
 * Decide, at launch, which events will happen and when.
 * Two slots in the cruise window and one at the target. Each slot fires with
 * probability `rate`. `windows` are in the same wall-clock ms as the sim clock.
 */
export function pickEvents(
  rng: () => number,
  ctx: EventCtx,
  windows: { cruise: [number, number]; target: [number, number] },
  rate: number,
): ScheduledEvent[] {
  const used = new Set<string>();
  const out: ScheduledEvent[] = [];

  const slots: { phase: FlightEvent["phase"]; from: number; to: number }[] = [];
  const [c0, c1] = windows.cruise;
  const half = (c1 - c0) / 2;
  slots.push({ phase: "cruise", from: c0, to: c0 + half });
  slots.push({ phase: "cruise", from: c0 + half, to: c1 });
  slots.push({ phase: "target", from: windows.target[0], to: windows.target[1] });

  for (const s of slots) {
    if (rng() > rate) continue;
    const pool = EVENTS.filter(
      (e) => e.phase === s.phase && !used.has(e.id) && (!e.when || e.when(ctx)),
    );
    if (pool.length === 0) continue;
    const event = pool[Math.floor(rng() * pool.length)];
    used.add(event.id);
    out.push({ atMs: s.from + rng() * (s.to - s.from), event });
  }
  return out.sort((a, b) => a.atMs - b.atMs);
}