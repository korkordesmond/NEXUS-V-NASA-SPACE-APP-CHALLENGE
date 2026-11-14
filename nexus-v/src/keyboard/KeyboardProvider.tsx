import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

interface Handler {
  advance?: () => void;
  back?: () => void;
  canAdvance?: () => boolean;
  canBack?: () => boolean;
}

const Ctx = createContext<{
  register: (h: Handler) => () => void;
}>({ register: () => () => {} });

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<Handler>({});

  const register = useCallback((h: Handler) => {
    handlerRef.current = h;
    return () => {
      // only clear if a newer page hasn't already registered
      if (handlerRef.current === h) handlerRef.current = {};
    };
  }, []);

  const value = useMemo(() => ({ register }), [register]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;

      // Never hijack typing.
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const h = handlerRef.current;

      if (e.key === "Enter") {
        const isButton = tag === "BUTTON";
        const isAdvanceCard = el?.hasAttribute("data-advance");
        const isSelected = el?.getAttribute("aria-pressed") === "true";

        // Buttons own Enter (the native click). The only exception is a
        // data-advance card that is already selected: Enter then moves on.
        // An unselected card keeps Enter, so Enter selects it first.
        if (isButton && !(isAdvanceCard && isSelected)) return;

        if (h.canAdvance?.() !== false && h.advance) {
          e.preventDefault();
          el?.blur();
          h.advance();
        }
        return;
      }

      if (e.key === "Backspace" || e.key === "Escape") {
        if (h.canBack?.() !== false && h.back) {
          e.preventDefault();
          h.back();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGlobalKeys(handler: Handler) {
  const { register } = useContext(Ctx);
  const latest = useRef(handler);

  // always point at this render's handler
  useEffect(() => {
    latest.current = handler;
  });

  // register once; the proxy reads the latest handler when a key is pressed
  useEffect(
    () =>
      register({
        advance: () => latest.current.advance?.(),
        back: () => latest.current.back?.(),
        canAdvance: () =>
          !!latest.current.advance && (latest.current.canAdvance?.() ?? true),
        canBack: () =>
          !!latest.current.back && (latest.current.canBack?.() ?? true),
      }),
    [register]
  );
}