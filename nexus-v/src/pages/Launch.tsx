import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMission } from "../state/MissionContext";
import { computeResources, totalCost } from "../lib/resources";
import { sectionsFor } from "../data/mission";
import { PlanetBody, PLANET_RADIUS_KM } from "../components/PlanetBody";
import CraftView from "../components/CraftView";
import {
  makeRng,
  pickEvents,
  type Choice,
  type Decision,
  type FlightEvent,
  type FlightResult,
} from "../data/events";

const SERIF = '"Source Serif 4", "Iowan Old Style", Charter, Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace';

const eyebrow =
  "text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400";

type Feed = "earth" | "forward" | "craft" | "system";

/* ─────────── Orbital mechanics (pure, no React) ─────────── */
const AU_KM = 149_597_870.7;
const C_KMS = 299_792.458;
const V_EARTH = 29.78;
const MU_E = 398_600;
const R_EARTH = 6_371;
const R_PARK = R_EARTH + 200;
const VE = 4.4;
const YEAR_S = 365.25 * 86400;
const SOI_KM = 600_000;
const FOV = (70 * Math.PI) / 180;
const VIEW_H = 600;

/* Altitude (km) at which the craft counts as "in space". Matches the point
   where the sky fades fully to black. Solar panels only show beyond this. */
const SPACE_KM = 100;

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* How long the team has to answer each debrief card, in ms. */
const DEBRIEF_CARD_MS = 12_000;

/* Quality score (0..1) → base score weight. Same tiers as Feedback and score.ts:
   0.8 and up is a good call, under 0.5 is a bad one. The real-world score for a
   decision is derived from this weight plus the deltas of cost/health/data. */
const qualityWeight = (q: Decision["quality"]) => (q >= 0.8 ? 1.0 : q >= 0.5 ? 0.35 : -0.9);

/* ─────────── Procedural textures (built once, cached) ─────────── */
type Tex = { earth: string; clouds: string; stars: string };
let texCache: Tex | null = null;
const mixc = (a: number[], b: number[], t: number) =>
  a.map((v, i) => lerp(v, b[i], t));

function fbm(w: number, h: number, cells: number, octaves: number, rng: () => number) {
  const out = new Float32Array(w * h);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const gx = cells * 2 ** o;
    const gy = Math.max(2, Math.round(gx / 2));
    const grid = Array.from({ length: gy + 1 }, () =>
      Array.from({ length: gx }, () => rng()),
    );
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * gy, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * gx, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
        const x1 = (x0 + 1) % gx;
        const top = lerp(grid[y0][x0], grid[y0][x1], sx);
        const bot = lerp(grid[y0 + 1][x0], grid[y0 + 1][x1], sx);
        out[y * w + x] += amp * lerp(top, bot, sy);
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function getTextures(): Tex {
  if (texCache) return texCache;
  if (typeof document === "undefined") return { earth: "", clouds: "", stars: "" };
  const rng = makeRng(1969);
  const W = 512, H = 256, THR = 0.54;
  const land = fbm(W, H, 3, 5, rng);
  const arid = fbm(W, H, 2, 3, rng);
  const cloud = fbm(W, H, 4, 5, rng);

  const mk = (w: number, h: number) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  };
  const sc = mk(W, H), cc = mk(W, H);
  const sCtx = sc.getContext("2d")!, cCtx = cc.getContext("2d")!;
  const sImg = sCtx.createImageData(W, H), cImg = cCtx.createImageData(W, H);

  const FOREST = [34, 92, 46], DESERT = [196, 164, 104], ROCK = [118, 106, 92], SNOW = [240, 246, 250];
  const SHALLOW = [38, 128, 170], DEEP = [7, 40, 92];

  for (let y = 0; y < H; y++) {
    const lat = Math.abs(y / H - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, n = land[i];
      let c: number[];
      if (n > THR) {
        const e = clamp((n - THR) / 0.12);
        const dry =
          clamp((arid[i] - 0.48) * 6) *
          clamp(lat * 5) *
          (1 - clamp((lat - 0.6) * 4));
        c = mixc(FOREST, DESERT, dry);
        c = mixc(c, ROCK, e * e);
        c = mixc(c, SNOW, clamp((lat - 0.78) * 8));
      } else {
        c = mixc(SHALLOW, DEEP, clamp((THR - n) / 0.2));
        c = mixc(c, SNOW, clamp((lat - 0.88) * 12));
      }
      sImg.data.set([c[0], c[1], c[2], 255], i * 4);
      cImg.data.set(
        [255, 255, 255, clamp((cloud[i] - 0.5) * 3.2) * 0.9 * 255],
        i * 4,
      );
    }
  }
  sCtx.putImageData(sImg, 0, 0);
  cCtx.putImageData(cImg, 0, 0);

  const S = 1024, st = mk(S, S), g = st.getContext("2d")!;
  for (let k = 0; k < 520; k++) {
    const x = rng() * S, y = rng() * S;
    const rad = 0.35 + Math.pow(rng(), 8) * 1.8;
    const a = 0.35 + 0.65 * Math.pow(rng(), 0.6);
    const tint = rng();
    const col =
      tint < 0.15 ? "170,200,255" : tint > 0.85 ? "255,210,170" : "255,255,255";
    if (rad > 1.3) {
      const glow = g.createRadialGradient(x, y, 0, x, y, rad * 4);
      glow.addColorStop(0, `rgba(${col},${a * 0.5})`);
      glow.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = glow;
      g.fillRect(x - rad * 4, y - rad * 4, rad * 8, rad * 8);
    }
    g.fillStyle = `rgba(${col},${a})`;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }

  texCache = {
    earth: sc.toDataURL(),
    clouds: cc.toDataURL(),
    stars: st.toDataURL(),
  };
  return texCache;
}

const EVENT_RATE = 0.7;
const DEFAULT_RELIABILITY = 0.97;

function solveKepler(M: number, e: number) {
  let E = M;
  for (let i = 0; i < 8; i++)
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

function makeTransfer(R: number) {
  const a = (1 + R) / 2;
  const e = Math.abs(R - 1) / (1 + R);
  const inner = R < 1;
  const tTr = 0.5 * Math.pow(a, 1.5) * YEAR_S;
  const wE = (2 * Math.PI) / YEAR_S;
  const wP = wE / Math.pow(R, 1.5);
  const at = (f: number) => {
    const M = (inner ? Math.PI : 0) + Math.PI * clamp(f);
    const E = solveKepler(M, e);
    const r = a * (1 - e * Math.cos(E));
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    );
    const th = clamp(inner ? nu - Math.PI : nu, 0, Math.PI);
    return { r, th };
  };
  return {
    a,
    tTr,
    at,
    earthTh: (tau: number) => wE * tau,
    planetTh: (tau: number) => Math.PI - wP * (tTr - tau),
    path: Array.from({ length: 121 }, (_, i) => at(i / 120)),
  };
}

type SegKind = "ascent" | "park" | "tpi" | "coast" | "arrival" | "orbit";

const ASCENT_EVENTS: [number, string][] = [
  [0, "Liftoff"],
  [12, "Pitch Program"],
  [60, "Max-Q"],
  [85, "First-Stage Burn"],
  [150, "MECO · Stage Separation"],
  [165, "Second-Stage Burn"],
];

const burnCurve = (x: number) => Math.log(1 / (1 - 0.8 * x)) / Math.log(5);

function buildPlan(R: number, task: string, orbitDays: number) {
  const tr = makeTransfer(R);
  const vInf1 = V_EARTH * Math.abs(Math.sqrt((2 * R) / (1 + R)) - 1);
  const vArr = V_EARTH * Math.sqrt(2 / R - 2 / (1 + R));
  const vInf2 = Math.abs(V_EARTH / Math.sqrt(R) - vArr);
  const vPark = Math.sqrt(MU_E / R_PARK);
  const vEsc = Math.sqrt(vInf1 ** 2 + (2 * MU_E) / R_PARK);
  const dvAsc = 9.4;
  const dvTpi = vEsc - vPark;
  const dvArr = task === "flyby" ? 0 : 0.7 * vInf2 + (task === "land" ? 1 : 0);
  const dvTot = dvAsc + dvTpi + 0.06 + dvArr;

  const raw: { kind: SegKind; secs: number; ms: number }[] = [
    { kind: "ascent", secs: 510, ms: 16000 },
    { kind: "park", secs: 5400, ms: 2500 },
    { kind: "tpi", secs: 360, ms: 2000 },
    { kind: "coast", secs: tr.tTr, ms: Math.min(30000, 9000 + 4000 * R) },
    { kind: "arrival", secs: task === "land" ? 420 : 1800, ms: 5000 },
    ...(task === "orbit"
      ? [{ kind: "orbit" as SegKind, secs: orbitDays * 86400, ms: 6000 }]
      : []),
  ];
  let m = 0, ms = 0;
  const segs = raw.map((s) => {
    const o = {
      ...s,
      metStart: m,
      msStart: ms,
      msEnd: ms + s.ms,
      warp: s.secs / (s.ms / 1000),
    };
    m += s.secs;
    ms += s.ms;
    return o;
  });
  return {
    tr,
    segs,
    orbitDays,
    totalMs: ms,
    vInf1,
    vInf2,
    vArr,
    vPark,
    vEsc,
    dvAsc,
    dvTpi,
    dvArr,
    dvTot,
  };
}

type Plan = ReturnType<typeof buildPlan>;

function eventWindows(plan: Plan) {
  const coast = plan.segs.find((s) => s.kind === "coast")!;
  const arrival = plan.segs.find((s) => s.kind === "arrival")!;
  const pad = (coast.msEnd - coast.msStart) * 0.08;
  return {
    cruise: [coast.msStart + pad, coast.msEnd - pad] as [number, number],
    target: [arrival.msStart + 500, plan.totalMs - 500] as [number, number],
  };
}

function sample(plan: Plan, elapsed: number, task: string, planetR: number) {
  const { tr, segs } = plan;
  const seg = segs.find((s) => elapsed < s.msEnd) ?? segs[segs.length - 1];
  const frac = clamp((elapsed - seg.msStart) / (seg.msEnd - seg.msStart));
  const met = seg.metStart + frac * seg.secs;
  const R = tr.path[120].r;

  let speed = plan.vPark;
  let frame = "Earth";
  let earthKm = 200;
  let dv = plan.dvAsc;
  let ship = { r: 1, th: 0 };
  let earthTh = tr.earthTh(met);
  let planetThNow = tr.planetTh(0);
  let targetKm = Infinity;
  let burning = false;
  let stage = "";

  switch (seg.kind) {
    case "ascent": {
      const x = frac;
      speed = plan.vPark * burnCurve(x);
      earthKm = 200 * Math.pow(x, 1.1);
      dv = plan.dvAsc * burnCurve(x);
      burning = true;
      stage =
        [...ASCENT_EVENTS].reverse().find(([t]) => met >= t)?.[1] ?? "Liftoff";
      if (met >= 510 - 1) stage = "SECO";
      break;
    }
    case "park":
      stage = "Parking Orbit";
      break;
    case "tpi":
      speed = lerp(plan.vPark, plan.vEsc, frac);
      earthKm = lerp(200, 20000, frac * frac);
      dv = plan.dvAsc + plan.dvTpi * frac;
      burning = true;
      stage = "Trans-Planetary Injection";
      break;
    case "coast": {
      const tau = frac * tr.tTr;
      ship = tr.at(frac);
      earthTh = tr.earthTh(tau);
      planetThNow = tr.planetTh(tau);
      const d = Math.hypot(
        ship.r * Math.cos(ship.th) - Math.cos(earthTh),
        ship.r * Math.sin(ship.th) - Math.sin(earthTh),
      );
      const dt = Math.hypot(
        ship.r * Math.cos(ship.th) - R * Math.cos(planetThNow),
        ship.r * Math.sin(ship.th) - R * Math.sin(planetThNow),
      );
      earthKm = d * AU_KM + 20000;
      targetKm = dt * AU_KM + SOI_KM;
      speed = V_EARTH * Math.sqrt(2 / ship.r - 1 / tr.a);
      frame = "Sun";
      dv =
        plan.dvAsc +
        plan.dvTpi +
        0.02 * ((frac > 0.05 ? 1 : 0) + (frac > 0.5 ? 1 : 0) + (frac > 0.95 ? 1 : 0));
      const tcm = [0.05, 0.5, 0.95].some((p) => Math.abs(frac - p) < 0.012);
      stage =
        frac > 0.97
          ? "Approach"
          : tcm
            ? "Trajectory Correction"
            : "Interplanetary Cruise";
      break;
    }
    case "arrival": {
      ship = { r: R, th: Math.PI };
      earthTh = tr.earthTh(tr.tTr);
      planetThNow = Math.PI;
      const dE = Math.hypot(
        R * Math.cos(Math.PI) - Math.cos(earthTh),
        -Math.sin(earthTh),
      );
      earthKm = dE * AU_KM;
      const e = (1 - frac) ** 2;
      targetKm =
        task === "flyby"
          ? 8000 + (SOI_KM - 8000) * e
          : 400 + (SOI_KM - 400) * e;
      speed = plan.vArr;
      frame = "Sun";
      dv = plan.dvAsc + plan.dvTpi + 0.06 + plan.dvArr * frac;
      burning = task !== "flyby";
      stage =
        task === "flyby"
          ? "Closest Approach"
          : task === "land"
            ? "Entry, Descent & Landing"
            : "Orbit Insertion Burn";
      break;
    }
    case "orbit": {
      const tau = tr.tTr + frac * seg.secs;
      planetThNow = tr.planetTh(tau);
      ship = { r: R, th: planetThNow };
      earthTh = tr.earthTh(tau);
      earthKm =
        Math.hypot(
          R * Math.cos(planetThNow) - Math.cos(earthTh),
          R * Math.sin(planetThNow) - Math.sin(earthTh),
        ) * AU_KM;
      targetKm = 400;
      speed = V_EARTH / Math.sqrt(R);
      frame = "Sun";
      dv = plan.dvTot;
      stage = `In Orbit · Day ${Math.min(
        plan.orbitDays,
        Math.floor(frac * plan.orbitDays) + 1,
      )}`;
      break;
    }
  }

  const used = (1 - Math.exp(-dv / VE)) / (1 - Math.exp(-plan.dvTot / VE));
  const sunAU = ship.r;
  const earthAU = earthKm / AU_KM;
  return {
    seg,
    frac,
    met,
    speed,
    frame,
    earthKm,
    targetKm,
    burning,
    stage,
    used,
    ship,
    earthTh,
    planetTh: planetThNow,
    sunAU,
    earthAU,
    delaySec: earthKm / C_KMS,
    targetAng: Math.min(
      Math.PI,
      2 * Math.atan(planetR / Math.max(1, targetKm)),
    ),
  };
}

function msToMet(plan: Plan, ms: number): number {
  const seg =
    plan.segs.find((s) => ms < s.msEnd) ?? plan.segs[plan.segs.length - 1];
  const frac = clamp((ms - seg.msStart) / (seg.msEnd - seg.msStart));
  return seg.metStart + frac * seg.secs;
}

/* ─────────── Score model ─────────── */
function scoreChoice(
  c: Choice,
  delaySec: number,
  remainingAfter: { health: number; dataLoss: number },
) {
  const baseScore = 100 * qualityWeight(c.quality);

  const costPenalty = (c.effect.cost ?? 0) * 0.6;
  const healthPenalty = Math.max(0, -(c.effect.health ?? 0)) * 0.9;
  const dataPenalty = (c.effect.dataLoss ?? 0) * 0.7;
  const dataBonus = Math.max(0, -(c.effect.dataLoss ?? 0)) * 0.5;

  const exposure = clamp(delaySec / 1800, 0, 1); 
  const exposureFactor = 1 + exposure * 0.4;

  const integrity =
    clamp(remainingAfter.health / 100) * 20 +
    clamp(1 - remainingAfter.dataLoss / 100) * 15;

  return Math.round(
    (baseScore + dataBonus + integrity) * exposureFactor -
      costPenalty -
      healthPenalty -
      dataPenalty,
  );
}

/* ─────────── Formatting ─────────── */
const p2 = (n: number) => String(n).padStart(2, "0");
const fmtMET = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return d > 0
    ? `T+${d}d ${p2(h)}:${p2(m)}:${p2(sec)}`
    : `T+${p2(h)}:${p2(m)}:${p2(sec)}`;
};
const fmtDelay = (s: number) =>
  s < 1
    ? "<1 s"
    : s < 60
      ? `${s.toFixed(0)} s`
      : s < 3600
        ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
        : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
const fmtKm = (km: number) =>
  !isFinite(km)
    ? "—"
    : km < 1e6
      ? `${Math.round(km).toLocaleString()} km`
      : `${(km / 1e6).toFixed(1)} M km`;
const warpFmt = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fmtPts = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString()}`;

/* ─────────── Draggable Wrapper (Sharp version) ─────────── */
const CANVAS_INSETS = { top: 12, right: 12, bottom: 12, left: 12 };
const PANEL_CHROME = 100;

function Draggable({
  children,
  title,
  anchor,
  offset,
  isCollapsed,
  onToggleCollapse,
  zIndex,
  onActivate,
}: {
  children: React.ReactNode;
  title: string;
  anchor: "left" | "right";
  offset: { x: number; y: number };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  zIndex: number;
  onActivate: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const parentW = useRef(0);
  const drag = useRef<{
    id: number;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const limits = () => {
    const el = elRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return null;
    const { top, right, bottom, left } = CANVAS_INSETS;
    return {
      minX: left,
      minY: top,
      maxX: Math.max(left, parent.clientWidth - right - el.offsetWidth),
      maxY: Math.max(top, parent.clientHeight - bottom - el.offsetHeight),
    };
  };

  const commit = (x: number, y: number) => {
    const el = elRef.current;
    const L = limits();
    if (!el || !L) return;
    pos.current = { x: clamp(x, L.minX, L.maxX), y: clamp(y, L.minY, L.maxY) };
    el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
  };

  const sizeBody = () => {
    const el = elRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const avail =
      parent.clientHeight - CANVAS_INSETS.top - CANVAS_INSETS.bottom - PANEL_CHROME;
    el.style.setProperty("--panel-max-h", `${Math.max(96, avail)}px`);
  };

  useLayoutEffect(() => {
    const el = elRef.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;

    sizeBody();
    const L = limits();
    if (!L) return;
    parentW.current = parent.clientWidth;
    commit(
      anchor === "left" ? L.minX + offset.x : L.maxX - offset.x,
      L.minY + offset.y,
    );

    const refit = () => {
      sizeBody();
      const pw = parent.clientWidth;
      if (anchor === "right" && parentW.current)
        pos.current.x += pw - parentW.current;
      parentW.current = pw;
      commit(pos.current.x, pos.current.y);
    };
    const ro = new ResizeObserver(refit);
    ro.observe(el);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const onHeaderDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      ox: pos.current.x,
      oy: pos.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setIsFocused(true);
  };

  const onHeaderMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    commit(d.ox + (e.clientX - d.sx), d.oy + (e.clientY - d.sy));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFocused(false);
  };

  const active = isFocused || isDragging;

  return (
    <div
      ref={elRef}
      tabIndex={0}
      onFocus={() => {
        setIsFocused(true);
        onActivate();
      }}
      onBlur={onBlur}
      onPointerDown={onActivate}
      style={{ zIndex }}
      className="absolute left-0 top-0 flex w-60 max-w-[calc(100%-1.5rem)] flex-col will-change-transform"
    >
      <div
        className={`flex flex-col border p-4 shadow-2xl backdrop-blur-xl transition-colors duration-300 ${
          active
            ? "border-cyan-400/60 bg-[#05070a]/95 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
            : "border-white/20 bg-[#05070a]/90"
        }`}
      >
        <div
          className={`flex shrink-0 touch-none select-none items-center justify-between transition-[margin] duration-300 ${
            isCollapsed ? "mb-0" : "mb-3"
          } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={onHeaderDown}
          onPointerMove={onHeaderMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <h2 className={eyebrow} style={{ fontFamily: MONO }}>
            {title}
          </h2>
          <button
            type="button"
            aria-label={isCollapsed ? `Expand ${title}` : `Minimize ${title}`}
            aria-expanded={!isCollapsed}
            onClick={onToggleCollapse}
            className="grid size-6 cursor-pointer place-items-center text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus:outline-none"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`size-3.5 transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </button>
        </div>

        <div
          aria-hidden={isCollapsed}
          className={`overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 ${
            isCollapsed ? "opacity-0" : "opacity-100"
          }`}
          style={{ maxHeight: isCollapsed ? 0 : "var(--panel-max-h, 60vh)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Camera feed pieces ─────────── */
function FeedFinish({ rec = true }: { rec?: boolean }) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.6) 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-20" />
      {rec && (
        <div
          className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 sm:bottom-6 sm:left-6 text-[10px] tracking-widest text-rose-300/90"
          style={{ fontFamily: MONO }}
        >
          <span className="size-2 animate-pulse bg-rose-500" />
          REC
        </div>
      )}
    </>
  );
}

function EarthDisc({
  size,
  tex,
  shift,
}: {
  size: number;
  tex: Tex;
  shift: number;
}) {
  const s = Math.min(size, 4000);
  const layer = (
    url: string,
    sh: number,
    extra?: React.CSSProperties,
  ): React.CSSProperties => ({
    backgroundImage: `url(${url})`,
    backgroundSize: `${s * 2}px ${s}px`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: `${-sh}px 0`,
    ...extra,
  });
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{
        width: s,
        height: s,
        boxShadow: `0 0 ${s * 0.012 + 4}px ${
          s * 0.004 + 1
        }px rgba(125,190,255,0.55), 0 0 ${s * 0.05 + 8}px rgba(80,150,255,0.25)`,
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-full bg-[#0a2a5c]">
        <div className="absolute inset-0" style={layer(tex.earth, shift)} />
        <div
          className="absolute inset-0"
          style={layer(tex.clouds, shift * 1.35, { opacity: 0.85 })}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 32% 36%, rgba(255,255,255,0.10) 0%, transparent 38%, rgba(0,4,16,0.55) 72%, rgba(0,2,10,0.94) 100%)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            boxShadow: `inset 0 0 ${s * 0.06}px ${
              s * 0.012
            }px rgba(130,195,255,0.55)`,
          }}
        />
      </div>
    </div>
  );
}

const GROUND_FOV = (22 * Math.PI) / 180;
const PAD_DIST_KM = 0.5;
const ROCKET_KM = 0.07;
const CAM_H_KM = 0.012;

function Gantry({ w, h, op }: { w: number; h: number; op: number }) {
  const rows = 10;
  const ne = { vectorEffect: "non-scaling-stroke" as const };
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 20 100"
      preserveAspectRatio="none"
      style={{ opacity: op, overflow: "visible" }}
    >
      <g stroke="#a6b0bb" strokeWidth="1.2" fill="none">
        <line x1="1" y1="0" x2="1" y2="100" {...ne} />
        <line x1="19" y1="0" x2="19" y2="100" {...ne} />
        {Array.from({ length: rows }, (_, i) => {
          const y0 = (i * 100) / rows, y1 = ((i + 1) * 100) / rows;
          return (
            <g key={i} strokeWidth="0.8">
              <line x1="1" y1={y0} x2="19" y2={y0} {...ne} />
              <line x1="1" y1={y0} x2="19" y2={y1} {...ne} />
              <line x1="19" y1={y0} x2="1" y2={y1} {...ne} />
            </g>
          );
        })}
        <line x1="19" y1="28" x2="34" y2="28" strokeWidth="2" {...ne} />
        <line x1="19" y1="60" x2="34" y2="60" strokeWidth="2" {...ne} />
      </g>
      <rect x="6" y="-4" width="8" height="4" fill="#d4d9df" />
      <circle cx="10" cy="-6" r="1.6" fill="#ef4444" className="animate-pulse" />
    </svg>
  );
}

function EarthFeed({
  tex,
  altKm,
  speedKms,
  elapsed,
  zoom,
  sky,
  tracking,
  parts,
  launchOn,
  burning,
  glitch,
}: {
  tex: Tex;
  altKm: number;
  speedKms: number;
  elapsed: number;
  zoom: number;
  sky: number;
  tracking: boolean;
  parts: React.ComponentProps<typeof CraftView>["parts"];
  launchOn: boolean;
  burning: boolean;
  glitch: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1000, h: 600 });
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = box;
  const alt = Math.max(0, altKm);
  const pxRad = (h / GROUND_FOV) * zoom;
  const elev = Math.atan2(alt + ROCKET_KM / 2, PAD_DIST_KM);
  const tilt = Math.max(0.05, elev - 0.04);
  const range = Math.hypot(alt, PAD_DIST_KM);
  const horizonY = h / 2 + tilt * pxRad;
  const size = (ROCKET_KM / range) * pxRad;
  const padSize = (ROCKET_KM / PAD_DIST_KM) * pxRad;
  const padY = horizonY + Math.atan2(CAM_H_KM, PAD_DIST_KM) * pxRad;
  const baseY = horizonY - Math.atan2(alt - CAM_H_KM, PAD_DIST_KM) * pxRad;
  const lowAir = clamp(1 - alt / 25);
  const sinceLift = tracking ? elapsed / 1000 : 0;
  const onPad = alt < 0.002;
  const padVisible = padY - padSize * 1.5 < h;

  const amp = burning ? (alt < 1 ? 2.4 : alt < 15 ? 1 : 0.3) : 0;
  const ph = Date.now();
  const sx = (Math.sin(ph * 0.071) + 0.6 * Math.sin(ph * 0.19 + 1)) * amp;
  const sy = (Math.cos(ph * 0.083) + 0.6 * Math.sin(ph * 0.23)) * amp;

  const grow = clamp(sinceLift / 6);
  const cloudOp =
    clamp(sinceLift / 1.2) * (1 - clamp((sinceLift - 20) / 14)) * 0.9;
  const puffs: [number, number][] = [
    [-1, 0.9],
    [-0.62, 1.1],
    [-0.22, 1],
    [0.22, 1.15],
    [0.62, 1],
    [1, 0.85],
    [0, 1.3],
  ];

  const bw = Math.max(34, size * 0.3 + 18);
  const bh = Math.max(40, size + 18);
  const mastOp = 0.3 + 0.7 * sky;

  return (
    <div
      ref={boxRef}
      className={`absolute inset-0 overflow-hidden bg-[#02040a] ${
        glitch ? "translate-x-1" : ""
      }`}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${sx}px, ${sy}px) scale(1.03)` }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${tex.stars})`,
            backgroundSize: "800px 800px",
            opacity: 0.95 * (1 - sky),
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: sky,
            background:
              "linear-gradient(to bottom,#0f3f8a 0%,#2a6cb8 32%,#5fa4de 62%,#a9d3f0 86%,#e4f1fa 100%)",
          }}
        />
        {[0.45, 0.8].map((par, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${tex.clouds})`,
              backgroundSize: `${w * (1.4 + i * 0.7)}px ${w * (0.7 + i * 0.35)}px`,
              backgroundPosition: `${-w * (0.1 + i * 0.3)}px ${
                tilt * pxRad * par - w * 0.25
              }px`,
              opacity: (0.32 + i * 0.2) * sky * lowAir,
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            opacity: sky * lowAir,
            background:
              "radial-gradient(circle at 14% 8%, rgba(255,248,226,1) 0%, rgba(255,236,190,0.35) 3.5%, rgba(255,226,170,0.1) 12%, transparent 26%)",
          }}
        />
        {[
          [0.32, 46],
          [0.52, 84],
          [0.78, 30],
        ].map(([f, d]) => (
          <div
            key={f}
            className="absolute rounded-full"
            style={{
              left: `${14 + 72 * f}%`,
              top: `${8 + 84 * f}%`,
              width: d,
              height: d,
              transform: "translate(-50%,-50%)",
              background:
                "radial-gradient(circle, rgba(255,230,190,0.16), rgba(160,200,255,0.05) 60%, transparent 72%)",
              opacity: sky * lowAir,
            }}
          />
        ))}
        <div
          className="absolute inset-x-0"
          style={{
            top: horizonY - 70,
            height: 110,
            opacity: 0.85 * sky,
            background:
              "linear-gradient(to bottom, transparent, rgba(226,240,250,0.85) 62%, rgba(226,240,250,0.2))",
          }}
        />

        {horizonY > -80 && horizonY < h + 80 && (
          <svg
            className="absolute inset-x-0"
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            style={{
              top: horizonY - Math.max(26, 0.11 * h * zoom) + 1,
              height: Math.max(26, 0.11 * h * zoom),
              width: "100%",
              opacity: 0.35 + 0.65 * sky,
            }}
          >
            <path
              d="M0 20 L0 11 Q9 5 19 10 T38 9 T58 11 T79 7 T100 10 L100 20 Z"
              fill="#7d98a8"
            />
            <rect x="76" y="6" width="6.5" height="6" fill="#8aa1ae" />
            <rect x="77.2" y="8.4" width="1.7" height="3.6" fill="#5f7886" />
            <path
              d="M0 20 L0 15 Q12 11 26 14 T52 13 T76 15 T100 13 L100 20 Z"
              fill="#445f4e"
            />
          </svg>
        )}

        {horizonY < h && (
          <div
            className="absolute inset-x-0 bottom-0 overflow-hidden"
            style={{
              top: Math.max(0, horizonY),
              background:
                "linear-gradient(to bottom,#6f8c78 0%,#3b5a3a 5%,#25391f 38%,#0f190e 100%)",
              opacity: 0.35 + 0.65 * sky,
            }}
          >
            <div
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, rgba(0,0,0,0.16) 0 2px, transparent 2px 9px)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "rgba(150,148,140,0.55)",
                clipPath: "polygon(48.5% 0, 51.5% 0, 74% 100%, 26% 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: "rgba(30,30,28,0.35)",
                clipPath: "polygon(49.7% 0, 50.3% 0, 51% 100%, 49% 100%)",
              }}
            />
          </div>
        )}

        {tracking && padVisible && (
          <>
            <div
              className="absolute left-1/2 rounded-[50%]"
              style={{
                top: padY - padSize * 0.04,
                width: padSize * 1.5,
                height: padSize * 0.11,
                transform: "translateX(-50%)",
                background:
                  "radial-gradient(ellipse, #b5b9bd 0%, #8d9296 62%, #5d6165 100%)",
                opacity: mastOp,
              }}
            />
            <div
              className="absolute left-1/2 rounded-[50%] bg-black/75"
              style={{
                top: padY - padSize * 0.005,
                width: padSize * 0.3,
                height: padSize * 0.03,
                transform: "translateX(-50%)",
              }}
            />
            <div
              className="absolute"
              style={{
                left: `calc(50% - ${padSize * 0.5 + padSize * 0.19}px)`,
                top: padY - padSize * 1.08,
              }}
            >
              <Gantry w={padSize * 0.19} h={padSize * 1.08} op={mastOp} />
            </div>
            {[-1, 1].map((d) => (
              <div
                key={d}
                className="absolute"
                style={{
                  left: `calc(50% + ${d * padSize * 1.15}px)`,
                  top: padY - padSize * 1.5,
                  width: 2,
                  height: padSize * 1.5,
                  background: "linear-gradient(to bottom,#cbd5e1,#6b7280)",
                  opacity: mastOp,
                }}
              >
                <span className="absolute -left-[2px] -top-1 size-2 animate-pulse bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
                <span
                  className="absolute -left-1 top-2 size-3 rounded-full bg-amber-200/90 blur-[2px]"
                  style={{ opacity: 1 - sky * 0.7 }}
                />
              </div>
            ))}
          </>
        )}

        {tracking && (
          <>
            {onPad && sinceLift === 0 && (
              <>
                <div
                  className="absolute left-1/2 animate-pulse rounded-full bg-white/60 blur-md"
                  style={{
                    top: baseY - size * 0.55,
                    width: size * 0.18,
                    height: size * 0.1,
                    transform: `translateX(${-size * 0.16}px)`,
                  }}
                />
                <div
                  className="absolute left-1/2 animate-pulse rounded-full bg-white/50 blur-md"
                  style={{
                    top: baseY - size * 0.25,
                    width: size * 0.2,
                    height: size * 0.12,
                    transform: `translateX(${size * 0.04}px)`,
                  }}
                />
              </>
            )}

            {sinceLift > 0.05 &&
              puffs.map(([dir, sc], i) => {
                const pw = padSize * (0.35 + grow * 0.95) * sc;
                const ph2 = pw * 0.6;
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 rounded-full"
                    style={{
                      top: padY - ph2 * 0.75,
                      width: pw,
                      height: ph2,
                      transform: `translateX(calc(-50% + ${
                        dir *
                        (padSize * 0.18 + grow * padSize * 0.75 + sinceLift * 2)
                      }px))`,
                      background:
                        "radial-gradient(circle at 42% 38%, #ffffff 0%, #e2e2e2 40%, rgba(195,195,195,0) 72%)",
                      filter: `blur(${padSize * 0.02 + 3}px)`,
                      opacity: cloudOp,
                    }}
                  />
                );
              })}

            {burning && alt > 0.03 && padY > baseY && (
              <div
                className="absolute left-1/2"
                style={{
                  top: baseY,
                  height: padY - baseY,
                  width: Math.max(10, padSize * 0.55),
                  transform: `translateX(calc(-50% + ${
                    Math.sin(ph * 0.002) * 2
                  }px))`,
                  clipPath: "polygon(43% 0, 57% 0, 100% 100%, 0 100%)",
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0.28), rgba(240,240,240,0.9))",
                  filter: "blur(4px)",
                  opacity: lowAir,
                }}
              />
            )}
            {burning && alt < 3 && (
              <div
                className="absolute left-1/2 animate-pulse rounded-[50%]"
                style={{
                  top: padY - padSize * 0.12,
                  width: padSize * 1.6,
                  height: padSize * 0.34,
                  transform: "translateX(-50%)",
                  background:
                    "radial-gradient(ellipse, rgba(255,240,190,1) 0%, rgba(255,150,50,0.6) 40%, transparent 70%)",
                  opacity: clamp(1 - alt / 3),
                  filter: "blur(4px)",
                  mixBlendMode: "screen",
                }}
              />
            )}

            {size >= 10 ? (
              <>
                <div
                  className="absolute left-1/2"
                  style={{
                    top: baseY - size,
                    height: size,
                    transform: "translateX(-50%)",
                    filter: `drop-shadow(0 0 ${Math.max(
                      2,
                      size * 0.02,
                    )}px rgba(255,214,150,${0.35 * sky}))`,
                  }}
                >
                  <CraftView
                    parts={parts}
                    launchOn={launchOn}
                    flame={burning}
                    glow={false}
                    landerSep={0}
                    className="h-full w-auto"
                  />
                </div>
                {burning && (
                  <div
                    className="absolute left-1/2"
                    style={{
                      top: baseY - size * 0.08,
                      width: size * 0.5,
                      height: size * 0.5,
                      transform: "translateX(-50%)",
                      background:
                        "radial-gradient(circle, rgba(255,230,170,0.9) 0%, rgba(255,140,40,0.45) 35%, transparent 68%)",
                      mixBlendMode: "screen",
                    }}
                  />
                )}
              </>
            ) : (
              <div
                className="absolute left-1/2 rounded-full"
                style={{
                  top: baseY - size / 2,
                  width: 4,
                  height: 4,
                  transform: "translate(-50%,-50%)",
                  background: burning ? "#ffd9a0" : "#e5e7eb",
                  boxShadow: burning
                    ? "0 0 12px 5px rgba(255,170,70,0.85)"
                    : "0 0 6px 2px rgba(255,255,255,0.5)",
                }}
              />
            )}
          </>
        )}
      </div>

      {tracking && (
        <div
          className="pointer-events-none absolute left-1/2"
          style={{
            top: baseY - size / 2 - bh / 2,
            width: bw,
            height: bh,
            transform: "translateX(-50%)",
          }}
        >
          <span className="absolute left-0 top-0 size-3 border-l-2 border-t-2 border-cyan-300/80" />
          <span className="absolute right-0 top-0 size-3 border-r-2 border-t-2 border-cyan-300/80" />
          <span className="absolute bottom-0 left-0 size-3 border-b-2 border-l-2 border-cyan-300/80" />
          <span className="absolute bottom-0 right-0 size-3 border-b-2 border-r-2 border-cyan-300/80" />
          <span
            className="absolute -top-4 left-0 animate-pulse whitespace-nowrap text-[9px] tracking-widest text-cyan-300/90"
            style={{ fontFamily: MONO }}
          >
            TRK LOCK
          </span>
        </div>
      )}

      {!tracking && (
        <div className="absolute inset-0 grid place-items-center bg-black/55">
          <div className="text-center" style={{ fontFamily: MONO }}>
            <p className="text-sm uppercase tracking-[0.3em] text-amber-300">
              Tracking lost
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Spacecraft is beyond ground-camera range.
            </p>
          </div>
        </div>
      )}

      {tracking && (
        <div
          className="pointer-events-none absolute bottom-10 left-3 text-[10px] sm:bottom-12 sm:left-6 leading-relaxed tracking-widest text-slate-200/90"
          style={{ fontFamily: MONO }}
        >
          <div className="text-cyan-300/90">CAM_01 · LAUNCH_PAD</div>
          <div>ALT {alt < 10 ? alt.toFixed(2) : alt.toFixed(1)} KM</div>
          <div>RANGE {range < 10 ? range.toFixed(2) : range.toFixed(1)} KM</div>
          <div>VEL {Math.round(speedKms * 1000).toLocaleString()} M/S</div>
        </div>
      )}
      <FeedFinish />
    </div>
  );
}

/* ─────────── Launch button ─────────── */
function LaunchButton({
  phase,
  onLaunch,
}: {
  phase: "ready" | "counting" | "launched";
  onLaunch: () => void;
}) {
  const ready = phase === "ready";
  return (
    <button
      type="button"
      onClick={onLaunch}
      disabled={!ready}
      className={`inline-flex h-11 items-center justify-center px-8 text-sm font-bold uppercase tracking-[0.18em] transition-all duration-200 ${
        ready
          ? "border border-emerald-500 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
          : "border border-emerald-500/20 bg-transparent text-emerald-500/50 cursor-not-allowed"
      }`}
      style={{ fontFamily: MONO }}
    >
      {phase === "launched"
        ? "Launched"
        : phase === "counting"
          ? "Counting"
          : "Launch"}
    </button>
  );
}

/* ─────────── Main Page ─────────── */
const RING = Array.from({ length: 97 }, (_, k) => (k / 96) * Math.PI * 2);

type DebriefItem = { atMs: number; event: FlightEvent };

type ScoreEntry = { title: string; choice: string; delta: number };

export default function Launch() {
  const navigate = useNavigate();
  const { mission, update } = useMission();

  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLaunched, setIsLaunched] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // In-flight display state; authoritative accumulators live in `acc`
  const [health, setHealth] = useState(100);
  const [spentExtra, setSpentExtra] = useState(0);
  const [dataLoss, setDataLoss] = useState(0);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [score, setScore] = useState(0);
  const [scoreLog, setScoreLog] = useState<ScoreEntry[]>([]);
  const [failure, setFailure] = useState<"launch" | "health" | null>(null);

  // Post-flight debrief
  const [debriefQueue, setDebriefQueue] = useState<DebriefItem[]>([]);
  const [debriefIndex, setDebriefIndex] = useState(0);
  const debriefStarted = useRef(false);
  const finishTimeout = useRef<number | null>(null);

  const [cardMsLeft, setCardMsLeft] = useState<number>(DEBRIEF_CARD_MS);
  const cardDeadline = useRef<number | null>(null);
  const cardTickId = useRef<number | null>(null);

  const resolvedForIndex = useRef<number | null>(null);

  const acc = useRef({
    health: 100,
    spentExtra: 0,
    dataLoss: 0,
    decisions: [] as Decision[],
    score: 0,
    scoreLog: [] as ScoreEntry[],
  });

  const queue = useRef<{ atMs: number; event: FlightEvent }[]>([]);
  const failAtMs = useRef<number | null>(null);

  const [activeFeed, setActiveFeed] = useState<Feed>("system");
  const [cameraGlitch, setCameraGlitch] = useState(false);

  const [isResourceCollapsed, setIsResourceCollapsed] = useState(false);
  const [isCameraCollapsed, setIsCameraCollapsed] = useState(true);
  const [activePanel, setActivePanel] = useState<"resources" | "camera">(
    "resources",
  );

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState({ pitch: 60, yaw: 0 });
  const isDraggingCamera = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const baseResources = useMemo(() => computeResources(mission), [mission]);
  const tex = useMemo(() => getTextures(), []);

  const task = mission.task ?? "orbit";
  const distAU = mission.planet?.distanceAU || 1.52;
  const planetId = mission.planet?.id ?? "mars";
  const planetName = mission.planet?.name ?? "Target";
  const planetR = PLANET_RADIUS_KM[planetId] ?? 3390;
  const orbitDays = Math.max(1, mission.orbitDays ?? 1);
  const reliability =
    (mission.parts.launch as { reliability?: number } | undefined)
      ?.reliability ?? DEFAULT_RELIABILITY;

  const plan = useMemo(
    () => buildPlan(distAU, task, orbitDays),
    [distAU, task, orbitDays],
  );
  const t = sample(plan, elapsed, task, planetR);
  const isDone = elapsed >= plan.totalMs;

  // Solar panels stay stowed until the craft is out of the atmosphere
  const solar = !!mission.parts.power?.solar;
  const inSpace = t.earthKm >= SPACE_KM;
  const solarVisible = solar && inSpace;

  // Parts handed to CraftView: same build, but with solar panels and the
  // landing vehicle held back until the craft is out of the atmosphere
  const craftParts = useMemo(() => {
    if (inSpace) return mission.parts;
    const next: typeof mission.parts = { ...mission.parts };
    if (solar && next.power) next.power = { ...next.power, solar: false };
    delete (next as Record<string, unknown>).landing;
    return next;
  }, [mission.parts, solar, inSpace]);

  // Propellant
  const fuelBase = baseResources.find((r) => r.key === "fuel");
  const fuelCapacity = fuelBase
    ? fuelBase.limit > 0
      ? fuelBase.limit
      : fuelBase.used * 1.15
    : 0;
  const fuelRemaining = fuelBase ? fuelCapacity - fuelBase.used * t.used : 1;
  const fuelEmpty = isLaunched && !isDone && fuelRemaining <= 0;

  const reserve = mission.budget - totalCost(mission) - spentExtra;

  const flightOutcome: FlightResult["outcome"] | null =
    failure === "launch"
      ? "launch"
      : failure === "health"
        ? "health"
        : fuelEmpty
          ? "fuel"
          : isDone
            ? "complete"
            : null;

  const activeItem: DebriefItem | null =
    debriefQueue.length > 0 && debriefIndex < debriefQueue.length
      ? debriefQueue[debriefIndex]
      : null;
  const activeEvent = activeItem?.event ?? null;
  const isDebriefing = activeItem !== null;
  const evSnap = activeItem
    ? sample(plan, activeItem.atMs, task, planetR)
    : null;

  const liveResources = baseResources.map((r) =>
    r.key === "fuel" && fuelBase
      ? { ...r, used: Math.max(0, fuelRemaining) }
      : r,
  );

  // ── Camera pan & zoom ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.max(0.2, Math.min(5, z - e.deltaY * 0.002)));
    };
    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      isDraggingCamera.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingCamera.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setRotation((r) => ({
        pitch: Math.max(-90, Math.min(90, r.pitch + dy * 0.5)),
        yaw: r.yaw + dx * 0.5,
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      isDraggingCamera.current = false;
      if (canvas.hasPointerCapture(e.pointerId))
        canvas.releasePointerCapture(e.pointerId);
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  // ── Terminal count → liftoff ──
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const rng = makeRng(Date.now());
      failAtMs.current =
        rng() > reliability
          ? plan.segs[0].msEnd * (0.2 + 0.75 * rng())
          : null;
      queue.current = pickEvents(
        rng,
        { planetId, task, solar: !!mission.parts.power?.solar },
        eventWindows(plan),
        EVENT_RATE,
      );
      setCountdown(null);
      setIsLaunched(true);
      return;
    }
    const id = setTimeout(
      () => setCountdown((c) => (c === null ? null : c - 1)),
      1000,
    );
    return () => clearTimeout(id);
  }, [countdown]);

  // ── Simulation clock (does NOT gate on fuelEmpty; only stops on end-states) ──
  useEffect(() => {
    if (!isLaunched || isPaused || isDone || failure) return;
    const id = setInterval(() => {
      setElapsed((e) => Math.min(plan.totalMs, e + 50));
      if (Math.random() > 0.97) {
        setCameraGlitch(true);
        setTimeout(() => setCameraGlitch(false), 100);
      }
    }, 50);
    return () => clearInterval(id);
  }, [isLaunched, isPaused, isDone, failure, plan.totalMs]);

  // ── Launch-reliability failure check ──
  useEffect(() => {
    if (!isLaunched || failure) return;
    if (failAtMs.current !== null && elapsed >= failAtMs.current)
      setFailure("launch");
  }, [elapsed, isLaunched, failure]);

  // ── Apply final result and route to feedback ──
  const finish = (
    finalHealth: number,
    finalSpent: number,
    finalDataLoss: number,
    finalDecisions: Decision[],
    finalScore: number,
    finalLog: ScoreEntry[],
    finalOutcome: FlightResult["outcome"],
  ) => {
    update({
      result: {
        outcome: finalOutcome,
        progress: clamp(elapsed / plan.totalMs),
        stageReached: t.stage,
        health: finalHealth,
        reserve: mission.budget - totalCost(mission) - finalSpent,
        spent: totalCost(mission) + finalSpent,
        dataLoss: finalDataLoss,
        fuelLeft:
          fuelBase && fuelCapacity > 0
            ? clamp(fuelRemaining / fuelCapacity)
            : 1,
        decisions: finalDecisions,
        eventsHit: finalDecisions.length,
        launchReliability: reliability,
        score: finalScore,
        scoreLog: finalLog,
      } as FlightResult,
    });
    if (finishTimeout.current) window.clearTimeout(finishTimeout.current);
    finishTimeout.current = window.setTimeout(
      () => navigate("/feedback"),
      finalOutcome === "complete" ? 3000 : 4500,
    );
  };

  // ── Seed the debrief once the flight ends ──
  useEffect(() => {
    if (flightOutcome === null || debriefStarted.current) return;
    debriefStarted.current = true;

    acc.current = {
      health,
      spentExtra,
      dataLoss,
      decisions,
      score: 0,
      scoreLog: [],
    };

    const reached = queue.current.filter((e) => e.atMs <= elapsed);
    queue.current = [];

    if (flightOutcome === "launch" || reached.length === 0) {
      finish(
        health,
        spentExtra,
        dataLoss,
        decisions,
        0,
        [],
        flightOutcome,
      );
      return;
    }

    resolvedForIndex.current = null;
    setDebriefQueue(reached);
    setDebriefIndex(0);
  }, [flightOutcome]);

  // ── Card countdown ──
  useEffect(() => {
    if (!activeItem) {
      if (cardTickId.current) {
        window.clearInterval(cardTickId.current);
        cardTickId.current = null;
      }
      cardDeadline.current = null;
      return;
    }

    const deadline = Date.now() + DEBRIEF_CARD_MS;
    cardDeadline.current = deadline;
    setCardMsLeft(DEBRIEF_CARD_MS);

    if (cardTickId.current) window.clearInterval(cardTickId.current);
    cardTickId.current = window.setInterval(() => {
      const left = (cardDeadline.current ?? 0) - Date.now();
      if (left <= 0) {
        if (cardTickId.current) {
          window.clearInterval(cardTickId.current);
          cardTickId.current = null;
        }
        setCardMsLeft(0);
        skipActiveCard();
      } else {
        setCardMsLeft(left);
      }
    }, 100);

    return () => {
      if (cardTickId.current) {
        window.clearInterval(cardTickId.current);
        cardTickId.current = null;
      }
    };
  }, [debriefIndex, debriefQueue.length]);

  // ── Record a choice ──
  const choose = (c: Choice) => {
    if (!activeItem) return;
    if (resolvedForIndex.current === debriefIndex) return;
    resolvedForIndex.current = debriefIndex;

    if (cardTickId.current) {
      window.clearInterval(cardTickId.current);
      cardTickId.current = null;
    }
    cardDeadline.current = null;
    setCardMsLeft(DEBRIEF_CARD_MS);

    const a = acc.current;
    const nextHealth = Math.max(0, a.health + (c.effect.health ?? 0));
    const nextSpent = a.spentExtra + (c.effect.cost ?? 0);
    const nextDataLoss = Math.min(100, a.dataLoss + (c.effect.dataLoss ?? 0));

    const delta = scoreChoice(c, evSnap?.delaySec ?? 0, {
      health: nextHealth,
      dataLoss: nextDataLoss,
    });
    const nextScore = a.score + delta;
    const nextScoreLog = [
      ...a.scoreLog,
      { title: activeItem.event.title, choice: c.label, delta },
    ];

    const nextDecisions: Decision[] = [
      ...a.decisions,
      {
        title: activeItem.event.title,
        choice: c.label,
        quality: c.quality,
        text: c.outcome,
      },
    ];

    acc.current = {
      health: nextHealth,
      spentExtra: nextSpent,
      dataLoss: nextDataLoss,
      decisions: nextDecisions,
      score: nextScore,
      scoreLog: nextScoreLog,
    };

    setHealth(nextHealth);
    setSpentExtra(nextSpent);
    setDataLoss(nextDataLoss);
    setDecisions(nextDecisions);
    setScore(nextScore);
    setScoreLog(nextScoreLog);

    if (nextHealth <= 0) {
      setFailure("health");
      finish(
        nextHealth,
        nextSpent,
        nextDataLoss,
        nextDecisions,
        nextScore,
        nextScoreLog,
        "health",
      );
      return;
    }

    const isLast = debriefIndex + 1 >= debriefQueue.length;
    if (isLast) {
      finish(
        nextHealth,
        nextSpent,
        nextDataLoss,
        nextDecisions,
        nextScore,
        nextScoreLog,
        flightOutcome ?? "complete",
      );
    } else {
      resolvedForIndex.current = null;
      setDebriefIndex(debriefIndex + 1);
    }
  };

  // ── Skip the current card (no decision recorded) ──
  const skipActiveCard = () => {
    if (!activeItem) return;
    if (resolvedForIndex.current === debriefIndex) return;
    resolvedForIndex.current = debriefIndex;

    if (cardTickId.current) {
      window.clearInterval(cardTickId.current);
      cardTickId.current = null;
    }
    cardDeadline.current = null;
    setCardMsLeft(DEBRIEF_CARD_MS);

    const isLast = debriefIndex + 1 >= debriefQueue.length;
    if (isLast) {
      const a = acc.current;
      finish(
        a.health,
        a.spentExtra,
        a.dataLoss,
        a.decisions,
        a.score,
        a.scoreLog,
        flightOutcome ?? "complete",
      );
    } else {
      resolvedForIndex.current = null;
      setDebriefIndex(debriefIndex + 1);
    }
  };

  // Number keys 1-3 pick a choice while the debrief modal is open
  useEffect(() => {
    if (!activeEvent) return;
    const onKey = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1;
      if (idx < 0 || idx > 2) return;
      if (resolvedForIndex.current === debriefIndex) return;
      const c = activeEvent.choices[idx];
      if (c && reserve >= (c.effect.cost ?? 0)) choose(c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Clear pending timers on unmount
  useEffect(
    () => () => {
      if (finishTimeout.current) window.clearTimeout(finishTimeout.current);
      if (cardTickId.current) window.clearInterval(cardTickId.current);
    },
    [],
  );

  // ── Derived display ──
  const doneLabel =
    task === "land"
      ? "Landing"
      : task === "orbit"
        ? "Orbit Complete"
        : "Flyby Complete";
  const stage =
    failure === "launch"
      ? "LAUNCH_FAILURE"
      : failure === "health"
        ? "SPACECRAFT_LOST"
        : fuelEmpty
          ? "SIGNAL_LOST_/_OUT_OF_FUEL"
          : countdown !== null
            ? `Terminal Count · T-${countdown}`
            : !isLaunched
              ? "Standby"
              : isDebriefing
                ? `Debrief · ${debriefIndex + 1}/${debriefQueue.length}`
                : isDone
                  ? doneLabel
                  : t.stage;
  const engineLit =
    (countdown !== null && countdown <= 3) ||
    (isLaunched && !isDone && !fuelEmpty && !failure && t.burning);

  // ── 3D projection ──
  const pxPerAU = (250 / Math.max(distAU, 1)) * zoom;
  const project = (x: number, y: number, z: number) => {
    const yaw = (rotation.yaw * Math.PI) / 180;
    const pitch = (rotation.pitch * Math.PI) / 180;
    const x1 = x * Math.cos(yaw) - z * Math.sin(yaw);
    const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
    const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const s = clamp(2400 / (2400 + z2), 0.3, 3);
    return { x: x1 * s, y: y2 * s, s };
  };
  const polar = (r: number, th: number) =>
    project(r * Math.cos(th) * pxPerAU, 0, r * Math.sin(th) * pxPerAU);
  const toPath = (pts: { x: number; y: number }[]) =>
    pts
      .map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

  const earthAng = 2 * Math.asin(R_EARTH / (R_EARTH + Math.max(0, t.earthKm)));
  const earthPx = Math.max(2, (earthAng / FOV) * VIEW_H * zoom);
  const sky = clamp(1 - t.earthKm / 100);
  const targetPx = Math.max(2, (t.targetAng / FOV) * VIEW_H * zoom);

  const kind = t.seg.kind;
  const hasPower = !!mission.parts.power;
  const solarFrac = 1 / (t.sunAU * t.sunAU);
  const launchOn = kind === "ascent" || kind === "park" || kind === "tpi";
  const landerSep =
    task === "land" && kind === "arrival" ? clamp((t.frac - 0.35) / 0.65) : 0;
  const loadout = sectionsFor(mission.task).map(
    (sec) => [sec.title, mission.parts[sec.id]?.name ?? "—"] as const,
  );

  const trailEnd =
    kind === "coast"
      ? Math.floor(t.frac * 120)
      : kind === "arrival" || kind === "orbit"
        ? 120
        : 0;
  const arc =
    kind === "orbit"
      ? Array.from({ length: 24 }, (_, k) =>
          polar(distAU, Math.PI + ((t.ship.th - Math.PI) * (k + 1)) / 24),
        )
      : [];
  const trail = [
    ...plan.tr.path.slice(0, trailEnd + 1).map((p) => polar(p.r, p.th)),
    ...arc,
    polar(t.ship.r, t.ship.th),
  ];

  const rows: [string, string][] = [
    ["MET", fmtMET(t.met)],
    [`Speed (rel. ${t.frame})`, `${t.speed.toFixed(t.speed < 10 ? 3 : 2)} km/s`],
    [t.earthKm < 1000 ? "Altitude" : "Earth range", fmtKm(t.earthKm)],
    ["Target range", fmtKm(t.targetKm)],
    ["Sun distance", `${t.sunAU.toFixed(4)} AU`],
    ...(hasPower
      ? ([
          [
            solar ? "Solar output" : "Power source",
            solar
              ? `${(solarFrac * 100).toFixed(2)}% of 1 AU`
              : "RTG · steady",
          ],
        ] as [string, string][])
      : []),
    ["Segment progress", `${(t.frac * 100).toFixed(1)}%`],
    ["Δv used", `${(t.used * 100).toFixed(2)}%`],
    ["Light-time", fmtDelay(t.delaySec)],
    ["Event log", `${queue.current.length} pending`],
    [
      "Spent",
      `$${Math.round(totalCost(mission) + spentExtra).toLocaleString()}M / $${mission.budget.toLocaleString()}M`,
    ],
    ["Reserve", `$${Math.round(reserve).toLocaleString()}M`],
    ["Spacecraft health", `${Math.round(health)}%`],
    ["Data lost", `${Math.round(dataLoss)}%`],
    ["Score", `${score > 0 ? "+" : ""}${score}`],
  ];

  const quickStrip: [string, string][] = [
    ["MET", fmtMET(t.met)],
    [`v ${t.speed.toFixed(2)}`, `${t.frame} frame`],
    ["Prog", `${(t.frac * 100).toFixed(1)}%`],
    ["Δv", `${(t.used * 100).toFixed(1)}%`],
    ["Light", fmtDelay(t.delaySec)],
    ["Score", `${score > 0 ? "+" : ""}${score}`],
  ];

  const cardPct = activeItem
    ? Math.max(0, Math.min(1, cardMsLeft / DEBRIEF_CARD_MS))
    : 0;
  const cardUrgent = cardMsLeft <= 3000;

  return (
    <section className="relative flex h-full flex-col gap-3 overflow-hidden px-3 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4">
      {/* Stage: canvas + floating panels share this positioned box */}
      <div className="relative min-h-0 flex-1">
      {/* ─────────── Center Canvas ─────────── */}
      <div
        ref={canvasRef}
        className={`absolute inset-0 z-0 touch-none overflow-hidden border border-white/20 bg-black shadow-2xl ${
          isDraggingCamera.current ? "cursor-grabbing" : "cursor-crosshair"
        }`}
      >
        {activeFeed === "earth" && (
          <EarthFeed
            tex={tex}
            altKm={t.earthKm}
            speedKms={t.speed}
            elapsed={elapsed}
            zoom={zoom}
            sky={sky}
            tracking={kind === "ascent"}
            parts={craftParts}
            launchOn={launchOn}
            burning={engineLit && kind === "ascent"}
            glitch={cameraGlitch}
          />
        )}

        {activeFeed === "forward" && (
          <div
            className={`absolute inset-0 bg-[#02040a] ${
              cameraGlitch ? "translate-x-1" : ""
            }`}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${tex.stars})`,
                backgroundSize: `${800 * Math.max(0.6, zoom)}px`,
                backgroundPosition: `${-rotation.yaw * 2}px ${
                  -rotation.pitch * 2
                }px`,
              }}
            />
            {launchOn && (
              <div
                className="absolute inset-0"
                style={{
                  opacity: sky,
                  background:
                    "linear-gradient(to top,#8fc8f2,#2f79c9 45%,#01030a)",
                }}
              />
            )}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${-rotation.yaw * 4}px, ${
                  rotation.pitch * 4
                }px)`,
                opacity:
                  kind === "coast" || kind === "arrival" || kind === "orbit"
                    ? 1
                    : 0,
              }}
            >
              <PlanetBody id={planetId} size={targetPx} />
            </div>

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-end">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#05070a] via-[#05070a]/90 to-transparent" />
              <div className="absolute bottom-0 left-1/2 h-32 w-[120%] -translate-x-1/2 rounded-t-[100%] border-t-2 border-white/10 bg-[#0b0f19]" />
              {solarVisible && (
                <>
                  <div className="absolute bottom-20 left-[10%] h-16 w-24 -skew-y-6 sm:w-40 rounded-sm border border-sky-300/30 bg-[repeating-linear-gradient(90deg,rgba(30,64,175,0.7)_0_14px,rgba(15,23,42,0.9)_14px_16px)]" />
                  <div className="absolute bottom-20 right-[10%] h-16 w-24 skew-y-6 sm:w-40 rounded-sm border border-sky-300/30 bg-[repeating-linear-gradient(90deg,rgba(30,64,175,0.7)_0_14px,rgba(15,23,42,0.9)_14px_16px)]" />
                </>
              )}
              {hasPower && !solar && (
                <div className="absolute bottom-24 right-[12%] h-4 w-24 sm:w-40 rounded-full border border-white/20 bg-slate-700" />
              )}
              <div className="relative mx-auto mb-4 w-64">
                <div className="mx-auto h-24 w-16 rounded-t-full border-x-2 border-t-2 border-white/20 bg-slate-800/80" />
                <div className="mx-auto h-6 w-32 border-t-2 border-white/20 bg-slate-900" />
                <div
                  className="absolute -bottom-8 left-1/2 h-32 w-24 -translate-x-1/2 rounded-full bg-gradient-to-t from-cyan-500/40 to-transparent blur-xl transition-opacity duration-300"
                  style={{ opacity: engineLit ? 1 : 0 }}
                />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
                <div className="relative size-24">
                  <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-cyan-400" />
                  <div className="absolute bottom-0 left-1/2 h-6 w-px -translate-x-1/2 bg-cyan-400" />
                  <div className="absolute left-0 top-1/2 h-px w-6 -translate-y-1/2 bg-cyan-400" />
                  <div className="absolute right-0 top-1/2 h-px w-6 -translate-y-1/2 bg-cyan-400" />
                </div>
              </div>
            </div>
            <FeedFinish />
          </div>
        )}

        {activeFeed === "craft" && (
          <div
            className={`absolute inset-0 overflow-hidden bg-[#02040a] ${
              cameraGlitch ? "translate-x-1" : ""
            }`}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${tex.stars})`,
                backgroundSize: "800px 800px",
              }}
            />
            {kind === "coast" || kind === "arrival" || kind === "orbit" ? (
              <div className="absolute right-[10%] top-[8%]">
                <PlanetBody
                  id={planetId}
                  size={Math.min(420, Math.max(6, targetPx * 0.5))}
                />
              </div>
            ) : (
              <>
                <div
                  className="absolute inset-0 bg-gradient-to-b from-[#1e6fbf] to-[#8ec5f0]"
                  style={{ opacity: sky }}
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-center">
                  <div style={{ marginBottom: -Math.min(earthPx, 2400) * 0.7 }}>
                    <EarthDisc
                      size={Math.min(earthPx, 2400)}
                      tex={tex}
                      shift={elapsed * 0.02}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="h-[62%]"
                style={{
                  transform: `perspective(900px) rotateY(${rotation.yaw}deg) rotateX(${
                    (rotation.pitch - 60) * 0.3
                  }deg) scale(${zoom})`,
                }}
              >
                <CraftView
                  parts={craftParts}
                  launchOn={launchOn}
                  flame={engineLit && kind === "ascent"}
                  glow={engineLit && (kind === "tpi" || kind === "arrival")}
                  landerSep={landerSep}
                  className="h-full w-auto"
                />
              </div>
            </div>
            <FeedFinish />
          </div>
        )}

        {activeFeed === "system" && (
          <div
            className={`absolute inset-0 bg-[#02040a] ${
              cameraGlitch ? "translate-x-1" : ""
            }`}
          >
            <svg
              viewBox="-500 -300 1000 600"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <radialGradient id="sunGlow">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path
                d={toPath(RING.map((a) => polar(1, a)))}
                fill="none"
                stroke="#3b82f6"
                strokeOpacity="0.35"
              />
              <path
                d={toPath(RING.map((a) => polar(distAU, a)))}
                fill="none"
                stroke={mission.planet?.color || "#ccc"}
                strokeOpacity="0.35"
              />
              <path
                d={toPath(plan.tr.path.map((p) => polar(p.r, p.th)))}
                fill="none"
                stroke="#22d3ee"
                strokeOpacity="0.35"
                strokeDasharray="4 5"
              />
              <path d={toPath(trail)} fill="none" stroke="#22d3ee" strokeWidth="2" />

              {(() => {
                const s = polar(0, 0);
                return (
                  <circle cx={s.x} cy={s.y} r={34 * s.s} fill="url(#sunGlow)" />
                );
              })()}
              {(() => {
                const p = polar(1, t.earthTh);
                return (
                  <g>
                    <circle cx={p.x} cy={p.y} r={6} fill="#3b82f6" />
                    <text
                      x={p.x + 10}
                      y={p.y + 4}
                      fontSize="11"
                      fill="#93c5fd"
                      fontFamily={MONO}
                    >
                      Earth
                    </text>
                  </g>
                );
              })()}
              {(() => {
                const p = polar(distAU, t.planetTh);
                const c = mission.planet?.color || "#ccc";
                return (
                  <g>
                    <circle cx={p.x} cy={p.y} r={6} fill={c} />
                    <text
                      x={p.x + 10}
                      y={p.y + 4}
                      fontSize="11"
                      fill={c}
                      fontFamily={MONO}
                    >
                      {planetName}
                    </text>
                  </g>
                );
              })()}
              {(() => {
                const p = polar(t.ship.r, t.ship.th);
                return (
                  <g>
                    <circle cx={p.x} cy={p.y} r={7} fill="#22d3ee" opacity="0.25" />
                    <circle cx={p.x} cy={p.y} r={3} fill="#67e8f9" />
                  </g>
                );
              })()}
            </svg>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] opacity-20" />
          </div>
        )}

        {/* Overlay UI */}
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2 sm:left-6 sm:right-20 sm:top-6">
          <span className="border border-white/20 bg-black/60 px-3 py-1 text-xs font-bold tracking-widest text-cyan-300" style={{ fontFamily: MONO }}>
            {activeFeed === "earth"
              ? "EARTH_CAM"
              : activeFeed === "forward"
                ? "FWD_VIEW"
                : activeFeed === "craft"
                  ? "CHASE_CAM"
                  : "HELIO_VIEW"}
          </span>
          {isLaunched && (
            <>
              <span className="flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300" style={{ fontFamily: MONO }}>
                DELAY: {fmtDelay(t.delaySec)}
              </span>
              <span className="border border-white/20 bg-black/60 px-2 py-1 text-[10px] font-bold text-slate-300" style={{ fontFamily: MONO }}>
                WARP: ×{warpFmt.format(t.seg.warp)}
              </span>
              {!isDebriefing && queue.current.length > 0 && (
                <span className="border border-slate-500/30 bg-slate-500/10 px-2 py-1 text-[10px] font-bold text-slate-300" style={{ fontFamily: MONO }}>
                  LOGGED: {queue.current.length}
                </span>
              )}
              <span className={`border px-2 py-1 text-[10px] font-bold ${score >= 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`} style={{ fontFamily: MONO }}>
                SCORE: {score > 0 ? "+" : ""}{score}
              </span>
            </>
          )}
        </div>

        {failure && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-rose-950/40">
            <span className="mx-4 border border-rose-500/50 bg-black/80 px-4 py-2 text-center text-lg uppercase tracking-[0.2em] text-rose-300 sm:px-6 sm:py-3 sm:text-2xl" style={{ fontFamily: MONO }}>
              {failure === "launch" ? "LAUNCH_FAILURE" : "SPACECRAFT_LOST"}
            </span>
          </div>
        )}

        {countdown !== null && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <span className="text-5xl tabular-nums text-white/90 sm:text-7xl" style={{ fontFamily: MONO }}>
              T-{countdown}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 right-3 z-10 flex flex-col items-center gap-2 sm:bottom-6 sm:right-6 border border-white/20 bg-black/60 p-1.5 backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(5, z + 0.2))}
            className="grid size-8 place-items-center text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path d="M12 5v14M5 12h14" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </button>
          <div className="text-[10px] font-bold text-slate-500" style={{ fontFamily: MONO }}>
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
            className="grid size-8 place-items-center text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path d="M5 12h14" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─────────── Camera Feeds panel ─────────── */}
      <Draggable
        title="Camera Feeds"
        anchor="left"
        offset={{ x: 16, y: 60 }}
        isCollapsed={isCameraCollapsed}
        onToggleCollapse={() => setIsCameraCollapsed((c) => !c)}
        zIndex={activePanel === "camera" ? 40 : 30}
        onActivate={() => setActivePanel("camera")}
      >
        <div className="flex flex-col gap-2 pb-2 select-none">
          {(
            [
              ["earth", "Earth", "Ground camera, tracks the launch"],
              ["forward", "Forward", "Cockpit view"],
              ["craft", "Spacecraft", "Your build, chase cam"],
              ["system", "Solar System (3D)", "Drag to orbit, scroll to zoom"],
            ] as [Feed, string, string][]
          ).map(([key, name, sub]) => (
            <button
              key={key}
              onClick={() => setActiveFeed(key)}
              className={`group flex items-center justify-between border px-4 py-3 text-left transition ${
                activeFeed === key
                  ? "border-cyan-400/80 bg-cyan-400/10"
                  : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.04]"
              }`}
            >
              <div className="pointer-events-none flex flex-col">
                <span className="text-sm font-bold text-white" style={{ fontFamily: MONO }}>
                  {name}
                </span>
                <span className="text-[10px] text-slate-400" style={{ fontFamily: MONO }}>
                  {sub}
                </span>
              </div>
              <div
                className={`pointer-events-none size-2 transition-colors ${
                  activeFeed === key
                    ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]"
                    : "bg-white/10 group-hover:bg-white/20"
                }`}
              />
            </button>
          ))}
        </div>
      </Draggable>

      {/* ─────────── Telemetry panel ─────────── */}
      <Draggable
        title="Telemetry"
        anchor="right"
        offset={{ x: 16, y: 16 }}
        isCollapsed={isResourceCollapsed}
        onToggleCollapse={() => setIsResourceCollapsed((c) => !c)}
        zIndex={activePanel === "resources" ? 40 : 30}
        onActivate={() => setActivePanel("resources")}
      >
        <div className="flex flex-col gap-5 pb-2 select-none">
          {liveResources.map((r) => {
            const max = r.limit > 0 ? r.limit : r.used + 100;
            const pct = Math.max(0, Math.min(100, (r.used / max) * 100));
            let barColor = "bg-cyan-400";
            if (r.status === "over" || pct < 15) barColor = "bg-rose-500";
            else if (r.status === "warn" || pct < 30) barColor = "bg-amber-400";

            return (
              <div key={r.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300" style={{ fontFamily: MONO }}>
                    {r.label}
                  </span>
                  <span className="text-xs tabular-nums text-slate-400" style={{ fontFamily: MONO }}>
                    {Math.floor(r.used).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden bg-black/60">
                  <div
                    className={`h-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-bold text-slate-300" style={{ fontFamily: MONO }}>
                Spacecraft health
              </span>
              <span className="text-xs tabular-nums text-slate-400" style={{ fontFamily: MONO }}>
                {Math.round(health)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden bg-black/60">
              <div
                className={`h-full transition-all duration-300 ${
                  health < 30 ? "bg-rose-500" : health < 60 ? "bg-amber-400" : "bg-cyan-400"
                }`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
            {loadout.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 text-[10px] text-slate-400" style={{ fontFamily: MONO }}>
                <span>{k}</span>
                <span className="truncate text-right text-slate-300">{v}</span>
              </div>
            ))}
          </div>

          {isLaunched && (
            <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-3">
              {rows.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-3 text-[10px] text-slate-400"
                  style={{ fontFamily: MONO }}
                >
                  <span>{k}</span>
                  <span className="text-right tabular-nums" style={{ fontFamily: MONO }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isLaunched && scoreLog.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500" style={{ fontFamily: MONO }}>
                Decision log
              </span>
              {scoreLog.map((e, i) => (
                <div key={i} className="flex justify-between gap-2 text-[10px]" style={{ fontFamily: MONO }}>
                  <span className="truncate text-slate-400">{e.title}</span>
                  <span
                    className={`tabular-nums ${e.delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                    style={{ fontFamily: MONO }}
                  >
                    {fmtPts(e.delta)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Draggable>

      {/* ─────────── Bottom panel ─────────── */}
      </div>

      <div className="relative z-20 flex max-h-[46dvh] shrink-0 flex-col overflow-y-auto border border-white/20 bg-[#05070a]/95 p-3 shadow-2xl sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-baseline gap-3">
            <span className={eyebrow} style={{ fontFamily: MONO }}>
              MET
            </span>
            <span className="text-xl tabular-nums text-white" style={{ fontFamily: MONO }}>
              {isLaunched
                ? fmtMET(t.met)
                : countdown !== null
                  ? `T-${p2(countdown)}`
                  : "T-00:00:10"}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500" style={{ fontFamily: MONO }}>
              Status
            </span>
            <span
              className={`min-w-0 break-words border px-3 py-1 text-xs font-bold uppercase ${
                fuelEmpty || failure
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
              }`}
              style={{ fontFamily: MONO }}
            >
              {stage}
            </span>
            <span
              className={`border px-3 py-1 text-xs font-bold ${
                score >= 0
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
              style={{ fontFamily: MONO }}
            >
              {score > 0 ? "+" : ""}
              {score} pts
            </span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden border border-white/10 bg-black/50">
          <div
            className={`h-full transition-all duration-75 ease-linear ${
              fuelEmpty || failure
                ? "bg-rose-500"
                : "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
            }`}
            style={{ width: `${(elapsed / plan.totalMs) * 100}%` }}
          />
        </div>

        {/* Live strip — always visible, ticks with the sim */}
        {isLaunched && (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-white/10 pt-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickStrip.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-2 text-[10px] text-slate-400"
                style={{ fontFamily: MONO }}
              >
                <span>{k}</span>
                <span className="tabular-nums text-slate-200" style={{ fontFamily: MONO }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest" style={{ fontFamily: MONO }}>
            {failure === "launch"
              ? "LAUNCH FAILURE. LOADING FEEDBACK..."
              : failure === "health"
                ? "SPACECRAFT LOST. LOADING FEEDBACK..."
                : fuelEmpty
                  ? "CRITICAL FAILURE. PROPELLANT EXHAUSTED."
                  : countdown !== null
                    ? "TERMINAL COUNT IN PROGRESS."
                    : !isLaunched
                      ? "AWAITING LAUNCH COMMAND."
                      : isDebriefing
                        ? "POST-FLIGHT REVIEW: RESOLVING EVENTS."
                        : isDone
                          ? "MISSION COMPLETE. LOADING FEEDBACK..."
                          : isPaused
                            ? "SIMULATION PAUSED."
                            : "SIMULATION RUNNING..."}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {isLaunched && !isDone && !fuelEmpty && !failure && !activeEvent && (
              <button
                onClick={() => setIsPaused((p) => !p)}
                className="inline-flex h-11 items-center gap-2 border border-white/20 bg-black/40 px-6 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-white/10"
                style={{ fontFamily: MONO }}
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
            )}

            <LaunchButton
              phase={isLaunched ? "launched" : countdown !== null ? "counting" : "ready"}
              onLaunch={() => {
                if (!isLaunched && countdown === null) setCountdown(10);
              }}
            />
          </div>
        </div>
      </div>

      {/* ─────────── Post-flight review modal ─────────── */}
      {activeEvent && (
        <div
          className="absolute inset-0 z-50 flex overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Post-flight review: ${activeEvent.title}`}
        >
          <div
            key={debriefIndex}
            className={`m-auto w-full max-w-lg border bg-[#05070a]/95 p-4 shadow-2xl transition-colors sm:p-6 ${
              cardUrgent ? "border-rose-500/60" : "border-amber-400/40"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p
                className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300/90"
                style={{ fontFamily: MONO }}
              >
                Post-flight review
              </p>
              <span
                className={`text-[10px] tracking-widest tabular-nums ${
                  cardUrgent ? "text-rose-300 animate-pulse" : "text-slate-500"
                }`}
                style={{ fontFamily: MONO }}
              >
                DECISION {debriefIndex + 1} / {debriefQueue.length}
                {" · "}
                {(cardMsLeft / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400" style={{ fontFamily: MONO }}>
              Logged event at {fmtMET(msToMet(plan, activeItem?.atMs ?? 0))}
            </p>

            <div className="mt-3 h-1 overflow-hidden bg-white/10">
              <div
                className="h-full bg-amber-400/80 transition-[width] duration-300"
                style={{
                  width: `${((debriefIndex + 1) / debriefQueue.length) * 100}%`,
                }}
              />
            </div>
            <div className="mt-1.5 h-0.5 overflow-hidden bg-white/10">
              <div
                className={`h-full ${cardUrgent ? "bg-rose-500" : "bg-amber-300"}`}
                style={{ width: `${cardPct * 100}%` }}
              />
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white" style={{ fontFamily: SERIF }}>
              {activeEvent.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300" style={{ fontFamily: MONO }}>
              {activeEvent.text}
            </p>
            {evSnap && evSnap.delaySec >= 1 && (
              <p className="mt-2 text-[11px] text-amber-300/80" style={{ fontFamily: MONO }}>
                One-way light time at this point: {fmtDelay(evSnap.delaySec)}.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {activeEvent.choices.map((c, i) => {
                const cost = c.effect.cost ?? 0;
                const affordable = reserve >= cost;
                return (
                  <button
                    key={`${c.label}-${i}`}
                    onClick={() => choose(c)}
                    disabled={!affordable}
                    autoFocus={i === 0}
                    className="flex items-start justify-between gap-4 border border-white/10 bg-black/40 px-4 py-3 text-left transition hover:border-cyan-400/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>
                      <span className="block text-sm font-bold text-white" style={{ fontFamily: MONO }}>
                        <span className="mr-2 text-slate-500">[{i + 1}]</span>
                        {c.label}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400" style={{ fontFamily: MONO }}>
                        {affordable ? c.detail : "Not enough reserve for this option."}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-amber-300" style={{ fontFamily: MONO }}>
                      {cost > 0 ? `$${cost}M` : "Free"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider" style={{ fontFamily: MONO }}>
                Let the timer run out to skip.
              </p>
              <p className="text-[11px] text-slate-500" style={{ fontFamily: MONO }}>
                Reserve ${Math.round(reserve).toLocaleString()}M · Score{" "}
                <span className={score >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {score > 0 ? "+" : ""}
                  {score}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}