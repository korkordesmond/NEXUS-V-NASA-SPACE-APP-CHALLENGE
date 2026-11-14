/* ─────────── Tasks ─────────── */

export type Task = "flyby" | "orbit" | "land" | "return";

export interface TaskInfo {
  id: Task;
  title: string;
  short: string;
  description: string;
}

export const TASKS: TaskInfo[] = [
  {
    id: "flyby",
    title: "Fly past the planet",
    short: "Flyby",
    description: "Swing by and take measurements, like Voyager 2 at Neptune. No braking burn.",
  },
  {
    id: "orbit",
    title: "Stay above the planet",
    short: "Orbit",
    description: "Brake into orbit and observe for a set number of days.",
  },
  {
    id: "land",
    title: "Land on the planet",
    short: "Landing",
    description: "Descend and work on the surface. Only rocky worlds can be landed on.",
  },
  {
    id: "return",
    title: "Circle and return home",
    short: "Round trip",
    description: "Orbit, then fly back to Earth. No planetary round trip has flown yet.",
  },
];

/* ─────────── Planets ─────────── */

export const SOLAR_CONSTANT = 1361; // W/m² at 1 AU
export const MARS_DEPARTURE_DV = 3.59; // km/s, low Earth orbit → Mars transfer
export const MAX_ARRAY_SUNLIGHT = 2; // arrays get tilted away when sunlight is too strong

export interface Planet {
  id: string;
  name: string;
  distanceAU: number; // from the Sun
  solarFlux: number; // W/m², mean
  hasAtmosphere: boolean;
  canLand: boolean;
  canOrbit: boolean;
  canReturn: boolean;
  travelDays: number; // one way, from a real mission
  returnWaitDays: number; // wait at the planet before the return window
  departureDv: number; // km/s from low Earth orbit onto the transfer
  captureDv: number; // km/s orbit insertion burn (elliptical science orbit)
  landingDv: number; // km/s extra for landing where there is no atmosphere
  route: string;
}

/*
 Sources found: sunlight (mean W/m²), Hohmann times and delta-v for Venus and Mars,
 MESSENGER dates (Aug 2004 → Mar 2011), Mars low-orbit insertion (~2.05 km/s) and
 the ~1.3 km/s elliptical-orbit figure, Perseverance cruise (203 days).
 From my own knowledge, please verify: departureDv for the assisted routes
 (Mercury, Jupiter, Saturn, Neptune), captureDv for Mercury/Venus/Jupiter/Saturn,
 the Mercury landing speed (~3 km/s), the exact Juno/Cassini/Voyager trip lengths
 and the return waiting times.
*/
export const PLANETS: Planet[] = [
  {
    id: "mercury", name: "Mercury", distanceAU: 0.39, solarFlux: 9116,
    hasAtmosphere: false, canLand: true, canOrbit: true, canReturn: false,
    travelDays: 2420, returnWaitDays: 0,
    departureDv: 3.95, captureDv: 0.9, landingDv: 3.0,
    route: "MESSENGER style: Earth, Venus and Mercury flybys",
  },
  {
    id: "venus", name: "Venus", distanceAU: 0.72, solarFlux: 2611,
    hasAtmosphere: true, canLand: true, canOrbit: true, canReturn: true,
    travelDays: 150, returnWaitDays: 470,
    departureDv: 3.48, captureDv: 1.3, landingDv: 0,
    route: "Direct transfer (Venus Express took 153 days)",
  },
  {
    id: "mars", name: "Mars", distanceAU: 1.52, solarFlux: 589,
    hasAtmosphere: true, canLand: true, canOrbit: true, canReturn: true,
    travelDays: 210, returnWaitDays: 450,
    departureDv: 3.59, captureDv: 1.3, landingDv: 0,
    route: "Direct transfer (Perseverance took 203 days)",
  },
  {
    id: "jupiter", name: "Jupiter", distanceAU: 5.2, solarFlux: 50.5,
    hasAtmosphere: true, canLand: false, canOrbit: true, canReturn: false,
    travelDays: 1795, returnWaitDays: 0,
    departureDv: 4.54, captureDv: 0.55, landingDv: 0,
    route: "Juno style: one Earth gravity assist",
  },
  {
    id: "saturn", name: "Saturn", distanceAU: 9.54, solarFlux: 15.04,
    hasAtmosphere: true, canLand: false, canOrbit: true, canReturn: false,
    travelDays: 2450, returnWaitDays: 0,
    departureDv: 3.94, captureDv: 0.65, landingDv: 0,
    route: "Cassini style: Venus, Venus, Earth and Jupiter assists",
  },
  {
    id: "neptune", name: "Neptune", distanceAU: 30.07, solarFlux: 1.5,
    hasAtmosphere: true, canLand: false, canOrbit: false, canReturn: false,
    travelDays: 4380, returnWaitDays: 0,
    departureDv: 7.15, captureDv: 0, landingDv: 0,
    route: "Voyager 2 style: Grand Tour assists, flyby only",
  },
];

export function tasksFor(planet: Planet | null): TaskInfo[] {
  if (!planet) return [];
  return TASKS.filter(
    (t) =>
      t.id === "flyby" ||
      (t.id === "orbit" && planet.canOrbit) ||
      (t.id === "land" && planet.canLand) ||
      (t.id === "return" && planet.canReturn)
  );
}

// sunlight on the arrays relative to Earth (capped: arrays tilt away near the Sun)
export const sunlightRatio = (planet: Planet) =>
  Math.min(planet.solarFlux / SOLAR_CONSTANT, MAX_ARRAY_SUNLIGHT);

// worst-case one-way radio delay (Earth and planet on opposite sides of the Sun)
export const lightMinutes = (planet: Planet) =>
  Math.round((planet.distanceAU + 1) * 8.317);

export const formatDays = (days: number) =>
  days < 730 ? `${days} days` : `${(days / 365).toFixed(1)} years`;

/* ─────────── Sections ─────────── */

export type Section = "launch" | "payload" | "power" | "comms" | "propulsion" | "lander";

export interface SectionInfo {
  id: Section;
  title: string;
  hint: string;
}

export const SECTIONS: SectionInfo[] = [
  { id: "launch", title: "Launch vehicle", hint: "Sets how much mass can leave Earth for your target." },
  { id: "payload", title: "Payload", hint: "The instruments that justify the mission." },
  { id: "power", title: "Power", hint: "Solar wings fade with distance. Nuclear generators don't." },
  { id: "comms", title: "Comms", hint: "A bigger dish reaches farther." },
  { id: "propulsion", title: "Propulsion", hint: "Engine and propellant tanks together." },
  { id: "lander", title: "Landing", hint: "Heat shield, parachutes or rockets for touchdown." },
];

export function sectionsFor(task: Task | null): SectionInfo[] {
  return SECTIONS.filter((s) => s.id !== "lander" || task === "land");
}

/* ─────────── Parts ─────────── */

export interface Part {
  id: string;
  name: string;
  section: Section;
  blurb: string; // the real-world reference
  cost: number; // millions of USD, before bus and integration
  mass: number; // kg, dry
  power: number; // W: positive makes power (at 1 AU if solar), negative uses it
  solar?: boolean; // output scales with sunlight
  propellant?: number; // kg, propulsion stages
  isp?: number; // s, propulsion stages
  reachAU?: number; // comms: farthest Earth distance with a useful link
  capacity?: { leo: number; mars: number }; // launch vehicles, kg
  planets?: string[]; // only offered for these planets
  tasks?: Task[]; // only offered for these tasks
  est?: boolean; // some numbers are my estimates, not sourced
}

/*
 Sourced: launch capacities (SpaceX, Atlas V 541 to LEO), Atlas V launch cost ($243M
 for Mars 2020), Mars-2020 EDL masses, Perseverance MMRTG and science payload,
 MESSENGER instruments and engine (645 N, 317 s, ~600 kg propellant), Cassini UVIS,
 Cassini RTGs and propellant, Juno and MRO solar output, MRO propellant (~1,150 kg),
 Magellan array output, Venus probe concept, small-array specific power.
 Marked est: most costs, array/antenna/stage dry masses, instrument power,
 Atlas V's Mars capacity, ion-drive numbers, comms reach (my model, see below).
 Comms reach model: range ∝ dish diameter × √power, calibrated on Voyager
 (3.7 m, 23 W, 160 bit/s at 165 AU) for a 10 kbit/s science link.
*/
export const PARTS: Part[] = [
  // ── launch vehicles
  { id: "falcon9", name: "Falcon 9 (expendable)", section: "launch", cost: 70, mass: 0, power: 0, capacity: { leo: 22800, mars: 4020 }, est: true,
    blurb: "SpaceX figures: 22.8 t to low Earth orbit, about 4 t toward Mars." },
  { id: "atlas541", name: "Atlas V 541", section: "launch", cost: 243, mass: 0, power: 0, capacity: { leo: 17410, mars: 3900 }, est: true,
    blurb: "Launched Curiosity and Perseverance. NASA paid about $243M for Mars 2020." },
  { id: "falconheavy", name: "Falcon Heavy (expendable)", section: "launch", cost: 150, mass: 0, power: 0, capacity: { leo: 63800, mars: 16800 }, est: true,
    blurb: "Most capable option: about 16.8 t toward Mars." },

  // ── payload
  { id: "mdis", name: "Dual imaging system", section: "payload", cost: 15, mass: 7.9, power: -10, est: true,
    blurb: "MESSENGER's camera pair: 7.9 kg and 10 W at peak." },
  { id: "mag", name: "Magnetometer on a boom", section: "payload", cost: 8, mass: 4.4, power: -4.2, est: true,
    blurb: "MESSENGER's: 4.4 kg including the boom, 4.2 W." },
  { id: "uvis", name: "Ultraviolet spectrograph", section: "payload", cost: 12.5, mass: 15.43, power: -12, est: true,
    blurb: "Cassini's UVIS: 15.43 kg, built for $12.5M." },
  { id: "mro-suite", name: "Orbital imaging and sounding suite", section: "payload", cost: 250, mass: 139, power: -300, tasks: ["orbit", "return"], est: true,
    blurb: "MRO's science payload weighed 139 kg: cameras, spectrometers, radar." },
  { id: "rover-suite", name: "Rover science package", section: "payload", cost: 400, mass: 58, power: -80, tasks: ["land"], est: true,
    blurb: "Perseverance's seven instruments weigh 58 kg." },

  // ── power
  { id: "array-s", name: "Small solar wings", section: "power", cost: 5, mass: 1, power: 150, solar: true, est: true,
    blurb: "CubeSat-class arrays reach up to about 165 W/kg." },
  { id: "array-m", name: "Solar wings (Magellan class)", section: "power", cost: 30, mass: 25, power: 1000, solar: true, est: true,
    blurb: "Magellan's two panels gave about 1.2 kW at Venus." },
  { id: "array-l", name: "Large solar wings (MRO class)", section: "power", cost: 70, mass: 110, power: 5000, solar: true, est: true,
    blurb: "MRO: about 5 kW in Earth orbit, roughly 2 kW at Mars." },
  { id: "array-xl", name: "Juno-class solar wings", section: "power", cost: 120, mass: 340, power: 14000, solar: true, est: true,
    blurb: "Juno: about 14 kW at Earth, only about 500 W at Jupiter." },
  { id: "mmrtg", name: "MMRTG (nuclear battery)", section: "power", cost: 150, mass: 45, power: 110, est: true,
    blurb: "Perseverance's: 45 kg and about 110 W, whatever the sunlight." },
  { id: "gphs3", name: "Three GPHS-RTGs (Cassini)", section: "power", cost: 400, mass: 168, power: 888, est: true,
    blurb: "Cassini's trio: 168 kg and 888 W at launch." },

  // ── communications
  { id: "mga", name: "Medium-gain X-band antenna", section: "comms", cost: 15, mass: 6, power: -60, reachAU: 4, est: true,
    blurb: "X-band has been the workhorse for science data since the 1970s." },
  { id: "hga15", name: "1.5 m high-gain antenna", section: "comms", cost: 35, mass: 25, power: -110, reachAU: 18, est: true,
    blurb: "Enough to reach Jupiter and Saturn at science rates." },
  { id: "hga3", name: "3 m X/Ka-band dish (MRO class)", section: "comms", cost: 80, mass: 60, power: -170, reachAU: 43, est: true,
    blurb: "MRO's 3 m dish returns up to 6 Mbit/s." },
  { id: "hga4", name: "4 m high-gain antenna (Cassini)", section: "comms", cost: 120, mass: 100, power: -220, reachAU: 66, est: true,
    blurb: "Cassini's dish. Voyager still talks from 165 AU with a 3.7 m one." },

  // ── propulsion (engine + tanks)
  { id: "mono", name: "Monopropellant stage (MRO class)", section: "propulsion", cost: 40, mass: 110, power: -40, propellant: 1150, isp: 225, est: true,
    blurb: "MRO launched with about 1,150 kg of propellant." },
  { id: "bi-s", name: "Small bipropellant stage", section: "propulsion", cost: 35, mass: 70, power: -30, propellant: 250, isp: 317, est: true,
    blurb: "MESSENGER's engine class (317 s) with a small tank." },
  { id: "bi-m", name: "Bipropellant stage (MESSENGER class)", section: "propulsion", cost: 55, mass: 120, power: -50, propellant: 600, isp: 317, est: true,
    blurb: "A 645 N engine and roughly 600 kg of propellant." },
  { id: "bi-l", name: "Large bipropellant stage (Cassini class)", section: "propulsion", cost: 120, mass: 450, power: -80, propellant: 3132, isp: 308, est: true,
    blurb: "Cassini carried 3,132 kg of propellant." },
  { id: "ion", name: "Ion drive (Dawn class)", section: "propulsion", cost: 150, mass: 130, power: -2500, propellant: 425, isp: 3100, est: true,
    blurb: "Very efficient, but draws kilowatts. Practical near the Sun." },

  // ── landing systems
  { id: "airbag", name: "Parachute and airbag lander", section: "lander", cost: 120, mass: 300, power: 0, planets: ["mars"], est: true,
    blurb: "Pathfinder-style. The whole Pathfinder mission cost $265M." },
  { id: "skycrane", name: "Heat shield and sky crane", section: "lander", cost: 450, mass: 1510, power: 0, planets: ["mars"], est: true,
    blurb: "Perseverance's: a 440 kg heat shield and a 1,070 kg fueled sky crane." },
  { id: "venus-probe", name: "Pressure-vessel entry probe", section: "lander", cost: 300, mass: 210, power: -100, planets: ["venus"], est: true,
    blurb: "A concept probe: about 206 kg and 103 W. The surface is around 465 °C." },
  { id: "retro", name: "Rocket-braked lander", section: "lander", cost: 350, mass: 600, power: -50, planets: ["mercury"], est: true,
    blurb: "No air to brake with, so rockets do it all (about 3 km/s)." },
];

export function partsFor(section: Section, planet: Planet | null, task: Task | null): Part[] {
  return PARTS.filter(
    (p) =>
      p.section === section &&
      (!p.planets || (planet ? p.planets.includes(planet.id) : false)) &&
      (!p.tasks || (task ? p.tasks.includes(task) : false))
  );
}

// how much mass this vehicle can send toward a planet: fitted through its
// published LEO and Mars figures with the rocket equation
export function launchCapacity(vehicle: Part | undefined, planet: Planet | null): number {
  if (!vehicle?.capacity || !planet) return 0;
  const { leo, mars } = vehicle.capacity;
  const effectiveVe = MARS_DEPARTURE_DV / Math.log(leo / mars);
  return Math.round(leo * Math.exp(-planet.departureDv / effectiveVe));
}

export interface PartStat {
  label: string;
  value: string;
  tone?: string;
}

export function partStats(p: Part, planet: Planet | null): PartStat[] {
  const out: PartStat[] = [];

  if (p.capacity) {
    if (planet) {
      out.push({ label: `To ${planet.name}`, value: `${launchCapacity(p, planet).toLocaleString()} kg` });
    }
    out.push({ label: "To LEO", value: `${(p.capacity.leo / 1000).toFixed(1)} t` });
    return out;
  }

  out.push({ label: "Mass", value: `${p.mass.toLocaleString()} kg` });

  if (p.power !== 0) {
    out.push({
      label: p.solar ? "Power @1 AU" : "Power",
      value: `${p.power > 0 ? "+" : ""}${p.power.toLocaleString()} W`,
      tone: p.power > 0 ? "text-emerald-300" : undefined,
    });
  }
  if (p.solar && planet) {
    out.push({
      label: `At ${planet.name}`,
      value: `+${Math.round(p.power * sunlightRatio(planet)).toLocaleString()} W`,
      tone: "text-emerald-300",
    });
  }
  if (p.propellant) out.push({ label: "Propellant", value: `${p.propellant.toLocaleString()} kg` });
  if (p.isp) out.push({ label: "Isp", value: `${p.isp} s` });
  if (p.reachAU) out.push({ label: "Reach", value: `${p.reachAU} AU` });

  return out;
}