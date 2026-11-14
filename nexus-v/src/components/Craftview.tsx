import type { Mission } from "../state/MissionContext";
import type { Section } from "../data/mission";

interface Props {
  parts: Mission["parts"];
  /** Launch vehicle still attached (until the cruise begins). */
  launchOn: boolean;
  /** Launch-vehicle exhaust. */
  flame: boolean;
  /** Spacecraft main engine firing (injection / arrival burns). */
  glow: boolean;
  /** 0 = lander attached, 1 = fully separated. */
  landerSep: number;
  className?: string;
}

const EDGE = "rgba(255,255,255,0.3)";
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ─────────── Shared materials ─────────── */
function Defs() {
  return (
    <defs>
      {/* Light comes from the upper left, so highlights sit left of centre */}
      <linearGradient id="cv-hull" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#6b7b92" />
        <stop offset="0.22" stopColor="#f1f5f9" />
        <stop offset="0.5" stopColor="#d3dce8" />
        <stop offset="0.8" stopColor="#94a3b8" />
        <stop offset="1" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="cv-hullV" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#eef2f7" />
        <stop offset="0.4" stopColor="#c3cedb" />
        <stop offset="1" stopColor="#566377" />
      </linearGradient>
      <linearGradient id="cv-white" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#9aa7b8" />
        <stop offset="0.25" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#e2e8f0" />
        <stop offset="1" stopColor="#8795a8" />
      </linearGradient>
      <linearGradient id="cv-black" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#0b1220" />
        <stop offset="0.3" stopColor="#3b4658" />
        <stop offset="1" stopColor="#0b1220" />
      </linearGradient>
      <linearGradient id="cv-gold" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#6e4d10" />
        <stop offset="0.2" stopColor="#e9b949" />
        <stop offset="0.42" stopColor="#fde9a6" />
        <stop offset="0.7" stopColor="#c8922f" />
        <stop offset="1" stopColor="#5f4009" />
      </linearGradient>
      <linearGradient id="cv-copper" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#6b2f0e" />
        <stop offset="0.35" stopColor="#f3a53a" />
        <stop offset="0.6" stopColor="#b45309" />
        <stop offset="1" stopColor="#4a1d07" />
      </linearGradient>
      {/* Darkens the ends of every cylinder so it reads as round */}
      <linearGradient id="cv-shade" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#000" stopOpacity="0.28" />
        <stop offset="0.12" stopColor="#000" stopOpacity="0" />
        <stop offset="0.85" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity="0.35" />
      </linearGradient>
      <linearGradient id="cv-spec" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.04" />
      </linearGradient>
      <radialGradient id="cv-cap" cx="0.4" cy="0.4" r="0.8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#aab6c6" />
      </radialGradient>
      <linearGradient id="cv-cell" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor="#1d4ed8" />
        <stop offset="0.5" stopColor="#3b82f6" />
        <stop offset="1" stopColor="#1e3a8a" />
      </linearGradient>
      <pattern id="cv-cells" width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M5 0H0V5" fill="none" stroke="rgba(191,219,254,0.38)" strokeWidth="0.6" />
      </pattern>
      <pattern id="cv-crinkle" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
        <path d="M0 2H9M0 6.5H9" stroke="rgba(110,64,0,0.28)" strokeWidth="1" />
        <path d="M0 4H9" stroke="rgba(255,244,190,0.28)" strokeWidth="0.8" />
      </pattern>
      <radialGradient id="cv-dishIn" cx="0.5" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#f8fafc" />
        <stop offset="0.55" stopColor="#cbd5e1" />
        <stop offset="1" stopColor="#64748b" />
      </radialGradient>
      <radialGradient id="cv-lens" cx="0.35" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#bae6fd" />
        <stop offset="0.3" stopColor="#0369a1" />
        <stop offset="1" stopColor="#0c1a2e" />
      </radialGradient>
      <radialGradient id="cv-bag" cx="0.38" cy="0.32" r="0.8">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#cbd5e1" />
        <stop offset="1" stopColor="#7a899d" />
      </radialGradient>
      <radialGradient id="cv-ti" cx="0.35" cy="0.3" r="0.85">
        <stop offset="0" stopColor="#e2e8f0" />
        <stop offset="0.5" stopColor="#64748b" />
        <stop offset="1" stopColor="#1e293b" />
      </radialGradient>
      <linearGradient id="cv-ablator" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor="#3b2410" />
        <stop offset="0.35" stopColor="#9a6a3a" />
        <stop offset="1" stopColor="#2a190b" />
      </linearGradient>
      <linearGradient id="cv-flame" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.25" stopColor="#fde68a" />
        <stop offset="0.7" stopColor="#f97316" stopOpacity="0.8" />
        <stop offset="1" stopColor="#f97316" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="cv-ion" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#e0f2fe" />
        <stop offset="0.4" stopColor="#38bdf8" stopOpacity="0.85" />
        <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
      </linearGradient>
      <filter id="cv-shadow" x="-30%" y="-20%" width="170%" height="150%">
        <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#000" floodOpacity="0.45" />
      </filter>
      <filter id="cv-blur" x="-50%" y="-20%" width="200%" height="140%">
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
    </defs>
  );
}

/* ─────────── Building blocks ─────────── */

/** A shaded cylinder: end shading, a bright highlight strip, and elliptical rims for depth. */
function Cyl({ x, y, w, h, fill = "url(#cv-hull)", rx = 2, cap = true }: {
  x: number; y: number; w: number; h: number; fill?: string; rx?: number; cap?: boolean;
}) {
  const ry = Math.min(5, w * 0.1);
  return (
    <g>
      <ellipse cx={x + w / 2} cy={y + h} rx={w / 2 - 0.5} ry={ry} fill={fill} stroke={EDGE} strokeWidth={0.8} />
      <ellipse cx={x + w / 2} cy={y + h} rx={w / 2 - 0.5} ry={ry} fill="rgba(0,0,0,0.3)" />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={EDGE} strokeWidth={1} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="url(#cv-shade)" />
      <rect x={x + w * 0.14} y={y + 4} width={Math.max(1.5, w * 0.07)} height={Math.max(2, h - 8)} rx={1} fill="url(#cv-spec)" />
      {cap && <ellipse cx={x + w / 2} cy={y} rx={w / 2 - 0.5} ry={ry} fill="url(#cv-cap)" stroke={EDGE} strokeWidth={0.8} />}
    </g>
  );
}

/** Crinkled gold thermal blanket. */
function Foil({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="url(#cv-gold)" />
      <rect x={x} y={y} width={w} height={h} fill="url(#cv-crinkle)" />
      <rect x={x} y={y} width={w} height={h} fill="url(#cv-shade)" />
      <rect x={x + w * 0.14} y={y + 3} width={2} height={h - 6} rx={1} fill="url(#cv-spec)" opacity={0.7} />
    </g>
  );
}

function Plume({ cx, y, w, len }: { cx: number; y: number; w: number; len: number }) {
  return (
    <g className="motion-safe:animate-pulse">
      <path d={`M${cx - w / 2} ${y} H${cx + w / 2} L${cx} ${y + len} Z`} fill="url(#cv-flame)" filter="url(#cv-blur)" />
      <path d={`M${cx - w / 4} ${y} H${cx + w / 4} L${cx} ${y + len * 0.6} Z`} fill="#fff7d6" opacity={0.85} />
    </g>
  );
}

function Nozzles({ cx, y, n, w = 7, gap = 2 }: { cx: number; y: number; n: number; w?: number; gap?: number }) {
  const start = cx - (n * w + (n - 1) * gap) / 2;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = start + i * (w + gap);
        return <path key={i} d={`M${x} ${y} H${x + w} L${x + w - 1} ${y + 6} H${x + 1} Z`} fill="url(#cv-copper)" />;
      })}
    </g>
  );
}

function Bell({ cx, y, w, h }: { cx: number; y: number; w: number; h: number }) {
  return (
    <g>
      <path
        d={`M${cx - w * 0.2} ${y} H${cx + w * 0.2} L${cx + w / 2} ${y + h} H${cx - w / 2} Z`}
        fill="url(#cv-copper)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={0.8}
      />
      <ellipse cx={cx} cy={y + h} rx={w / 2} ry={w * 0.1} fill="#1b0c04" stroke="rgba(255,200,120,0.5)" strokeWidth={0.8} />
    </g>
  );
}

/* ─────────── Launch vehicles ─────────── */
type Pass = "body" | "flame";

function Launcher({ id, only }: { id?: string; only: Pass }) {
  const body = only === "body";
  if (id === "falconheavy") {
    return body ? (
      <g>
        {[24, 100].map((x) => (
          <g key={x}>
            <Cyl x={x} y={266} w={36} h={66} fill="url(#cv-white)" cap={false} />
            <path d={`M${x} 266 Q${x + 18} 246 ${x + 36} 266 Z`} fill="url(#cv-white)" stroke={EDGE} strokeWidth={1} />
            <path d={`M${x} 266 Q${x + 18} 246 ${x + 36} 266 Z`} fill="url(#cv-shade)" />
            <Nozzles cx={x + 18} y={332} n={2} />
          </g>
        ))}
        <Cyl x={62} y={246} w={36} h={86} fill="url(#cv-white)" />
        <rect x={62} y={246} width={36} height={10} fill="url(#cv-black)" stroke={EDGE} strokeWidth={1} />
        <Nozzles cx={80} y={332} n={3} />
      </g>
    ) : (
      <g>
        <Plume cx={42} y={338} w={24} len={44} />
        <Plume cx={118} y={338} w={24} len={44} />
        <Plume cx={80} y={338} w={30} len={50} />
      </g>
    );
  }
  if (id === "atlas541") {
    return body ? (
      <g>
        {[44, 104].map((x) => (
          <g key={x}>
            <Cyl x={x} y={270} w={12} h={62} fill="url(#cv-white)" cap={false} />
            <path d={`M${x} 270 Q${x + 6} 254 ${x + 12} 270 Z`} fill="url(#cv-white)" stroke={EDGE} strokeWidth={1} />
            <Nozzles cx={x + 6} y={332} n={1} w={8} />
          </g>
        ))}
        <Cyl x={56} y={246} w={48} h={86} fill="url(#cv-white)" />
        <rect x={56} y={246} width={48} height={14} fill="url(#cv-hull)" stroke={EDGE} strokeWidth={1} />
        <rect x={56} y={300} width={48} height={2} fill="#1f2937" opacity={0.4} />
        <Nozzles cx={80} y={332} n={2} w={9} />
      </g>
    ) : (
      <g>
        <Plume cx={50} y={338} w={12} len={30} />
        <Plume cx={110} y={338} w={12} len={30} />
        <Plume cx={80} y={338} w={34} len={48} />
      </g>
    );
  }
  // Falcon 9 and the fallback
  return body ? (
    <g>
      <Cyl x={54} y={246} w={52} h={86} fill="url(#cv-white)" />
      <rect x={54} y={246} width={52} height={11} fill="url(#cv-black)" stroke={EDGE} strokeWidth={1} />
      <rect x={54} y={300} width={52} height={2} fill="#1f2937" opacity={0.4} />
      <Nozzles cx={80} y={332} n={5} />
    </g>
  ) : (
    <Plume cx={80} y={338} w={40} len={48} />
  );
}

/* ─────────── Propulsion ─────────── */
const ADAPTER: Record<string, [number, number]> = {
  mono: [24, 44],
  "bi-s": [28, 48],
  "bi-m": [32, 52],
  "bi-l": [40, 64],
  ion: [28, 36],
};

function Adapter({ id }: { id: string }) {
  const [tw, bw] = ADAPTER[id] ?? [32, 52];
  const d = `M${80 - tw / 2} 224 H${80 + tw / 2} L${80 + bw / 2} 246 H${80 - bw / 2} Z`;
  return (
    <g>
      <path d={d} fill="url(#cv-hull)" stroke={EDGE} strokeWidth={1} />
      <path d={d} fill="url(#cv-shade)" />
      <line x1={80 - lerp(tw, bw, 0.5) / 2} y1={235} x2={80 + lerp(tw, bw, 0.5) / 2} y2={235} stroke="rgba(15,23,42,0.35)" strokeWidth={1.5} />
    </g>
  );
}

function Engine({ id, only }: { id: string; only: Pass }) {
  const body = only === "body";
  if (id === "ion") {
    return body ? (
      <g>
        <ellipse cx={80} cy={248} rx={12} ry={3.5} fill="#0b1220" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
        <ellipse cx={80} cy={248} rx={8} ry={2} fill="none" stroke="#38bdf8" strokeWidth={1} opacity={0.8} />
      </g>
    ) : (
      <g className="motion-safe:animate-pulse">
        <path d="M74 249 H86 L80 306 Z" fill="url(#cv-ion)" filter="url(#cv-blur)" />
      </g>
    );
  }
  if (id === "mono") {
    return body ? (
      <g>
        <Bell cx={70} y={246} w={11} h={10} />
        <Bell cx={90} y={246} w={11} h={10} />
      </g>
    ) : (
      <g>
        <Plume cx={70} y={256} w={9} len={30} />
        <Plume cx={90} y={256} w={9} len={30} />
      </g>
    );
  }
  const dims: Record<string, [number, number]> = { "bi-s": [16, 14], "bi-m": [22, 18], "bi-l": [30, 24] };
  const [w, h] = dims[id] ?? [22, 18];
  return body ? <Bell cx={80} y={246} w={w} h={h} /> : <Plume cx={80} y={246 + h} w={w} len={52} />;
}

/* ─────────── Power ─────────── */
function Wing({ s, w, h, c, segs }: { s: -1 | 1; w: number; h: number; c: number; segs: number }) {
  const xin = s < 0 ? 52 : 108;
  const xout = xin + s * w;
  const hin = h * 0.86;
  const pts = `${xin},${c - hin / 2} ${xout},${c - h / 2} ${xout},${c + h / 2} ${xin},${c + hin / 2}`;
  const edge = `${xin},${c + hin / 2} ${xout},${c + h / 2} ${xout},${c + h / 2 + 3} ${xin},${c + hin / 2 + 3}`;
  const at = (f: number) => {
    const hh = lerp(hin, h, f);
    return { x: xin + s * w * f, t: c - hh / 2, b: c + hh / 2 };
  };
  return (
    <g>
      <line x1={s < 0 ? 56 : 104} y1={c} x2={xin} y2={c} stroke="#cbd5e1" strokeWidth={3} strokeLinecap="round" />
      <polygon points={edge} fill="#0b1220" />
      <polygon points={pts} fill="url(#cv-cell)" stroke="#cbd5e1" strokeWidth={1.4} />
      <polygon points={pts} fill="url(#cv-cells)" />
      <polygon points={`${xin},${c - hin / 2} ${xout},${c - h / 2} ${xout},${c - h * 0.08} ${xin},${c - hin * 0.02}`} fill="#fff" opacity={0.12} />
      {Array.from({ length: segs - 1 }, (_, i) => {
        const a = at((i + 1) / segs);
        return <line key={i} x1={a.x} y1={a.t} x2={a.x} y2={a.b} stroke="#cbd5e1" strokeWidth={1.4} />;
      })}
    </g>
  );
}

const WINGS: Record<string, { w: number; h: number; segs: number }> = {
  "array-s": { w: 24, h: 30, segs: 1 },
  "array-m": { w: 44, h: 48, segs: 3 },
  "array-l": { w: 44, h: 68, segs: 4 },
  "array-xl": { w: 46, h: 82, segs: 5 },
};

function Rtg({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={x + 5 + (i * (w - 12)) / 5} y={y - 3} width={3} height={h + 6} rx={1} fill="url(#cv-hullV)" stroke="rgba(15,23,42,0.4)" strokeWidth={0.6} />
      ))}
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="url(#cv-hullV)" stroke={EDGE} strokeWidth={1} />
      <rect x={x + 4} y={y + 2} width={w - 8} height={2} rx={1} fill="#fff" opacity={0.45} />
      <ellipse cx={x + w - 2} cy={y + h / 2} rx={2.5} ry={h / 2 - 1} fill="#1e293b" />
    </g>
  );
}

/* ─────────── Payload and comms ─────────── */
function Payload({ id }: { id?: string }) {
  switch (id) {
    case "mdis":
      return (
        <g>
          <Cyl x={64} y={84} w={32} h={40} rx={6} />
          {[73, 87].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={104} r={6.5} fill="#1f2937" stroke="#d6a640" strokeWidth={1.4} />
              <circle cx={cx} cy={104} r={4.6} fill="url(#cv-lens)" />
              <circle cx={cx - 1.4} cy={102.6} r={1} fill="#fff" opacity={0.8} />
            </g>
          ))}
        </g>
      );
    case "uvis":
      return (
        <g>
          <Cyl x={68} y={84} w={24} h={40} rx={4} />
          <rect x={74} y={92} width={12} height={20} rx={2} fill="#0b1220" stroke={EDGE} strokeWidth={0.8} />
          <rect x={79} y={94} width={2} height={16} fill="#38bdf8" opacity={0.75} />
        </g>
      );
    case "mro-suite":
      return (
        <g>
          <line x1={44} y1={90} x2={116} y2={90} stroke="#cbd5e1" strokeWidth={1.6} strokeLinecap="round" />
          <circle cx={44} cy={90} r={1.8} fill="#e2e8f0" />
          <circle cx={116} cy={90} r={1.8} fill="#e2e8f0" />
          <Cyl x={64} y={84} w={32} h={40} rx={5} />
          <Cyl x={83} y={96} w={14} h={24} rx={2} fill="url(#cv-black)" cap={false} />
          <ellipse cx={90} cy={120} rx={6} ry={2.2} fill="url(#cv-lens)" stroke="#d6a640" strokeWidth={0.8} />
          <rect x={67} y={96} width={12} height={20} rx={1.5} fill="#1e293b" stroke={EDGE} strokeWidth={0.8} />
        </g>
      );
    case "rover-suite":
      return (
        <g>
          <line x1={71} y1={84} x2={71} y2={66} stroke="#cbd5e1" strokeWidth={1.8} />
          <rect x={65} y={60} width={12} height={7} rx={1.5} fill="url(#cv-hullV)" stroke={EDGE} strokeWidth={0.8} />
          <circle cx={68} cy={63.5} r={1.8} fill="url(#cv-lens)" />
          <circle cx={74} cy={63.5} r={1.8} fill="url(#cv-lens)" />
          <Cyl x={64} y={84} w={32} h={40} rx={5} />
          <rect x={69} y={96} width={22} height={14} rx={2} fill="#0b1220" stroke={EDGE} strokeWidth={0.8} />
          <circle cx={75} cy={103} r={3} fill="url(#cv-lens)" />
          <circle cx={85} cy={103} r={3} fill="url(#cv-lens)" />
        </g>
      );
    case "mag":
      return (
        <g>
          <Cyl x={64} y={84} w={32} h={40} rx={6} />
          <circle cx={80} cy={104} r={7} fill="#0ea5e9" opacity={0.85} />
          <circle cx={78} cy={102} r={2} fill="#fff" opacity={0.6} />
          <line x1={64} y1={98} x2={8} y2={98} stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" />
          <line x1={64} y1={102} x2={8} y2={102} stroke="rgba(148,163,184,0.7)" strokeWidth={1} />
          {[18, 30, 42, 54].map((x) => (
            <line key={x} x1={x} y1={98} x2={x + 6} y2={102} stroke="rgba(203,213,225,0.7)" strokeWidth={0.8} />
          ))}
          <circle cx={7} cy={100} r={4.2} fill="url(#cv-ti)" stroke={EDGE} strokeWidth={0.8} />
        </g>
      );
    default:
      return (
        <g>
          <Cyl x={64} y={84} w={32} h={40} rx={6} />
          <circle cx={80} cy={104} r={7} fill="#0ea5e9" opacity={0.85} />
        </g>
      );
  }
}

function Dish({ w, hasPayload }: { w: number; hasPayload: boolean }) {
  const rimY = 60, ry = w * 0.08, depth = w * 0.21, focal = rimY - w * 0.3;
  const mastEnd = hasPayload ? 84 : 124;
  return (
    <g>
      <line x1={80} y1={rimY + depth * 0.9} x2={80} y2={mastEnd} stroke="#cbd5e1" strokeWidth={2.2} />
      <path d={`M${80 - w / 2} ${rimY} Q80 ${rimY + depth * 2} ${80 + w / 2} ${rimY} Z`} fill="url(#cv-hull)" stroke={EDGE} strokeWidth={1} />
      <path d={`M${80 - w / 2} ${rimY} Q80 ${rimY + depth * 2} ${80 + w / 2} ${rimY} Z`} fill="url(#cv-shade)" />
      <ellipse cx={80} cy={rimY} rx={w / 2} ry={ry} fill="url(#cv-dishIn)" stroke="rgba(255,255,255,0.65)" strokeWidth={1.2} />
      <ellipse cx={80} cy={rimY + ry * 0.2} rx={w * 0.2} ry={ry * 0.45} fill="rgba(15,23,42,0.18)" />
      <g stroke="#cbd5e1" strokeWidth={1}>
        <line x1={80 - w * 0.4} y1={rimY} x2={80} y2={focal + 3} />
        <line x1={80 + w * 0.4} y1={rimY} x2={80} y2={focal + 3} />
        <line x1={80} y1={rimY - ry} x2={80} y2={focal + 3} />
      </g>
      <rect x={77} y={focal - 2} width={6} height={6} rx={1.5} fill="url(#cv-hullV)" stroke={EDGE} strokeWidth={0.8} />
    </g>
  );
}

function Horn({ hasPayload }: { hasPayload: boolean }) {
  const mastEnd = hasPayload ? 84 : 124;
  return (
    <g>
      <line x1={80} y1={80} x2={80} y2={mastEnd} stroke="#cbd5e1" strokeWidth={2.2} />
      <path d="M73 82 L66 62 H94 L87 82 Z" fill="url(#cv-hull)" stroke={EDGE} strokeWidth={1} />
      <path d="M73 82 L66 62 H94 L87 82 Z" fill="url(#cv-shade)" />
      <ellipse cx={80} cy={62} rx={14} ry={3.2} fill="#0b1220" stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
    </g>
  );
}

const DISH_W: Record<string, number> = { hga15: 44, hga3: 64, hga4: 86 };

/* ─────────── Landing systems ─────────── */
function Lander({ id }: { id?: string }) {
  switch (id) {
    case "skycrane":
      return (
        <g>
          <path d="M30 208 H38 L50 238 H18 Z" fill="url(#cv-white)" stroke={EDGE} strokeWidth={1} />
          <path d="M30 208 H38 L50 238 H18 Z" fill="url(#cv-shade)" />
          <ellipse cx={34} cy={238} rx={16} ry={3.6} fill="url(#cv-ablator)" stroke={EDGE} strokeWidth={0.8} />
          <line x1={26} y1={222} x2={42} y2={222} stroke="rgba(15,23,42,0.35)" strokeWidth={1.2} />
          {[13, 51].map((x) => (
            <rect key={x} x={x} y={222} width={5} height={13} rx={2} fill="url(#cv-black)" stroke={EDGE} strokeWidth={0.6} />
          ))}
        </g>
      );
    case "venus-probe":
      return (
        <g>
          <line x1={34} y1={206} x2={34} y2={212} stroke="#cbd5e1" strokeWidth={1.6} />
          <circle cx={34} cy={226} r={14} fill="url(#cv-ti)" stroke={EDGE} strokeWidth={1} />
          <ellipse cx={34} cy={226} rx={14} ry={3.6} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
          <ellipse cx={29} cy={219} rx={4} ry={2.4} fill="#fff" opacity={0.45} />
        </g>
      );
    case "retro":
      return (
        <g>
          <g stroke="#cbd5e1" strokeWidth={1.8} strokeLinecap="round" fill="none">
            <path d="M25 226 L14 244 M43 226 L54 244" />
            <path d="M10 244 H18 M50 244 H58" strokeWidth={2.2} />
          </g>
          <Cyl x={24} y={212} w={20} h={15} rx={3} />
          <Bell cx={34} y={228} w={14} h={10} />
        </g>
      );
    default: // airbag
      return (
        <g>
          {[[26, 221], [42, 221], [26, 235], [42, 235]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={9} fill="url(#cv-bag)" stroke="rgba(15,23,42,0.35)" strokeWidth={0.8} />
          ))}
          <circle cx={34} cy={228} r={10} fill="url(#cv-bag)" stroke="rgba(15,23,42,0.35)" strokeWidth={0.8} />
          <path d="M28 222 L40 234 M40 222 L28 234" stroke="rgba(15,23,42,0.25)" strokeWidth={0.8} />
        </g>
      );
  }
}

/** The spacecraft exactly as assembled on the Build screen, minus selection UI. */
export default function CraftView({ parts, launchOn, flame, glow, landerSep, className }: Props) {
  const has = (s: Section) => !!parts[s];
  const id = (s: Section) => parts[s]?.id;
  const power = id("power");
  const rtg = has("power") && !parts.power?.solar;
  const prop = id("propulsion");
  const comms = id("comms");

  return (
    <svg viewBox="0 0 160 340" className={className} role="img" aria-label="Your spacecraft" style={{ overflow: "visible" }}>
      <Defs />

      <g filter="url(#cv-shadow)">
        {launchOn && has("launch") && <Launcher id={id("launch")} only="body" />}

        {has("propulsion") ? (
          <>
            <Adapter id={prop!} />
            {!launchOn && <Engine id={prop!} only="body" />}
          </>
        ) : (
          launchOn && <Cyl x={62} y={224} w={36} h={22} fill="url(#cv-black)" cap={false} />
        )}

        {has("power") &&
          (rtg ? (
            power === "gphs3" ? (
              <g>
                <line x1={104} y1={165} x2={110} y2={165} stroke="#cbd5e1" strokeWidth={2.4} />
                <line x1={109} y1={142} x2={109} y2={190} stroke="#cbd5e1" strokeWidth={2.4} />
                {[142, 160, 178].map((y) => (
                  <Rtg key={y} x={111} y={y} w={42} h={12} />
                ))}
              </g>
            ) : (
              <g>
                <line x1={104} y1={167} x2={112} y2={167} stroke="#cbd5e1" strokeWidth={2.4} />
                <Rtg x={112} y={158} w={38} h={17} />
              </g>
            )
          ) : (
            (() => {
              const wg = WINGS[power ?? "array-m"] ?? WINGS["array-m"];
              return (
                <g>
                  <Wing s={-1} w={wg.w} h={wg.h} c={170} segs={wg.segs} />
                  <Wing s={1} w={wg.w} h={wg.h} c={170} segs={wg.segs} />
                </g>
              );
            })()
          ))}

        {/* Bus: silver upper deck, gold thermal blanket below */}
        <g>
          <Cyl x={56} y={124} w={48} h={100} rx={3} />
          <Foil x={56} y={158} w={48} h={64} />
          <g stroke="rgba(15,23,42,0.4)" strokeWidth={1.6}>
            <line x1={56} y1={158} x2={104} y2={158} />
            <line x1={56} y1={192} x2={104} y2={192} />
          </g>
          <rect x={56} y={130} width={48} height={3} fill="#22d3ee" opacity={0.75} />
          <rect x={52} y={138} width={4} height={8} rx={1} fill="url(#cv-hullV)" stroke={EDGE} strokeWidth={0.6} />
          <rect x={104} y={138} width={4} height={8} rx={1} fill="url(#cv-hullV)" stroke={EDGE} strokeWidth={0.6} />
          {has("payload") && <Payload id={id("payload")} />}
        </g>

        {has("comms") && (comms === "mga" ? <Horn hasPayload={has("payload")} /> : <Dish w={DISH_W[comms ?? "hga3"] ?? 64} hasPayload={has("payload")} />)}

        {has("lander") && (
          <g
            style={{
              transform: `translate(${-landerSep * 60}px, ${landerSep * 150}px)`,
              opacity: 1 - landerSep * 0.5,
            }}
          >
            <Lander id={id("lander")} />
          </g>
        )}
      </g>

      {/* Exhaust is drawn outside the shadow so it stays bright */}
      {launchOn && has("launch") && flame && <Launcher id={id("launch")} only="flame" />}
      {!launchOn && has("propulsion") && glow && <Engine id={prop!} only="flame" />}
    </svg>
  );
}