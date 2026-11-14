import type { ReactNode } from "react";

function Chevrons({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === "left" ? (
        <>
          <path d="M11 17l-5-5 5-5" />
          <path d="M18 17l-5-5 5-5" />
        </>
      ) : (
        <>
          <path d="M13 17l5-5-5-5" />
          <path d="M6 17l5-5-5-5" />
        </>
      )}
    </svg>
  );
}

const round =
  "grid size-14 place-items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white/10";

interface StageNavProps {
  onPrev?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  children?: ReactNode; // center content, e.g. an action button
}

export default function StageNav({
  onPrev,
  onNext,
  nextDisabled,
  children,
}: StageNavProps) {
  return (
    <nav className="flex items-center justify-between">
      {onPrev ? (
        <button onClick={onPrev} aria-label="Previous" className={round}>
          <Chevrons dir="left" />
        </button>
      ) : (
        <span className="size-14" />
      )}

      <div>{children}</div>

      {onNext ? (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="Next"
          className={round}
        >
          <Chevrons dir="right" />
        </button>
      ) : (
        <span className="size-14" />
      )}
    </nav>
  );
}