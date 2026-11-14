export const SHADE =
  "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.32), transparent 42%), radial-gradient(circle at 72% 78%, transparent 38%, rgba(0,0,0,0.6) 100%)";

export interface PlanetLook {
  scale: number;
  base: string;
  details?: string;
  glow: string;
  tag: string;
  ring?: boolean;
}

export const PLANET_LOOK: Record<string, PlanetLook> = {
  mercury: {
    scale: 0.62,
    base: "radial-gradient(circle, #a8a29e, #78716c)",
    details:
      "radial-gradient(circle at 35% 55%, rgba(0,0,0,.28) 0 8%, transparent 9%), radial-gradient(circle at 62% 32%, rgba(0,0,0,.25) 0 6%, transparent 7%), radial-gradient(circle at 58% 70%, rgba(0,0,0,.3) 0 10%, transparent 11%), radial-gradient(circle at 25% 28%, rgba(0,0,0,.2) 0 5%, transparent 6%)",
    glow: "rgba(168,162,158,0.35)",
    tag: "Fastest orbit",
  },
  venus: {
    scale: 0.85,
    base: "radial-gradient(circle, #f3d28a, #c99a3e)",
    details: "repeating-linear-gradient(160deg, rgba(255,255,255,.16) 0 8%, transparent 8% 20%)",
    glow: "rgba(243,210,138,0.4)",
    tag: "Hottest surface",
  },
  mars: {
    scale: 0.7,
    base: "radial-gradient(circle, #e0653a, #b03a12)",
    details:
      "radial-gradient(ellipse 38% 16% at 50% 6%, rgba(255,255,255,.85), transparent 100%), radial-gradient(ellipse 30% 18% at 38% 55%, rgba(80,20,5,.45), transparent 100%), radial-gradient(ellipse 22% 14% at 66% 42%, rgba(80,20,5,.35), transparent 100%)",
    glow: "rgba(224,101,58,0.4)",
    tag: "The red planet",
  },
  jupiter: {
    scale: 1,
    base: "linear-gradient(180deg, #d8b48a 0% 12%, #a9754a 12% 22%, #e7cfa6 22% 38%, #b5835a 38% 50%, #dcc093 50% 66%, #a06b45 66% 78%, #d8b48a 78% 100%)",
    details:
      "radial-gradient(ellipse 16% 10% at 66% 62%, rgba(170,60,35,.95) 0 50%, rgba(170,60,35,0) 100%)",
    glow: "rgba(216,180,138,0.35)",
    tag: "Largest planet",
  },
  saturn: {
    scale: 0.88,
    base: "linear-gradient(180deg, #e8d8a8 0% 20%, #cdb67f 20% 38%, #ead9ab 38% 58%, #c4ab74 58% 76%, #e3d09c 76% 100%)",
    glow: "rgba(232,216,168,0.35)",
    tag: "Famous for its rings",
    ring: true,
  },
  neptune: {
    scale: 0.8,
    base: "radial-gradient(circle, #5b8def, #2347b8)",
    details:
      "radial-gradient(ellipse 22% 12% at 40% 58%, rgba(10,25,90,.6), transparent 100%), linear-gradient(170deg, rgba(255,255,255,.12) 0 20%, transparent 20% 45%, rgba(255,255,255,.1) 45% 60%, transparent 60%)",
    glow: "rgba(91,141,239,0.5)",
    tag: "Windiest world",
  },
};

export const FALLBACK_LOOK: PlanetLook = {
  scale: 0.8,
  base: "radial-gradient(circle, #9ca3af, #4b5563)",
  glow: "rgba(156,163,175,0.3)",
  tag: "",
};

export const lookOf = (id: string) => PLANET_LOOK[id] ?? FALLBACK_LOOK;

/** Mean radii in km, used for apparent size on the camera feeds. */
export const PLANET_RADIUS_KM: Record<string, number> = {
  mercury: 2440,
  venus: 6052,
  mars: 3390,
  jupiter: 69911,
  saturn: 58232,
  neptune: 24622,
};

const RING_BANDS = [
  { w: "200%", h: "56%", style: "border-[0.28rem] border-amber-100/55" },
  { w: "164%", h: "44%", style: "border-[0.16rem] border-amber-200/35" },
];

export function Ring({ front }: { front?: boolean }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 -rotate-[18deg] ${front ? "z-20" : "z-0"}`}
    >
      {RING_BANDS.map((b) => (
        <span
          key={b.w}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${b.style} ${front ? "[clip-path:inset(50%_0_0_0)]" : "[clip-path:inset(0_0_50%_0)]"
            }`}
          style={{ width: b.w, height: b.h }}
        />
      ))}
    </span>
  );
}

/** A planet disc of `size` px, styled to match the one picked on the Plan screen. */
export function PlanetBody({ id, size }: { id: string; size: number }) {
  const look = lookOf(id);
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      {look.ring && size >= 24 && <Ring />}
      <span
        className="absolute inset-0 z-10 rounded-full"
        style={{
          background: `${SHADE}, ${look.details ? `${look.details}, ` : ""}${look.base}`,
          boxShadow: `0 0 ${Math.min(60, size / 4)}px 2px ${look.glow}`,
        }}
      />
      {look.ring && size >= 24 && <Ring front />}
    </span>
  );
}