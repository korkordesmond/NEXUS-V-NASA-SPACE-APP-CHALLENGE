import { useEffect } from "react";

interface Options {
  wrap?: boolean;
  cols?: number; // grid only; measured from the CSS grid when omitted
  orientation?: "vertical" | "horizontal" | "grid";
  autoFocus?: boolean; // focus the selected item (or the first) on mount
}

const getItems = (root: HTMLElement, selector: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled")
  );

export function useArrowNav<T extends HTMLElement>(
  containerRef: React.RefObject<T | null>,
  selector: string,
  {
    wrap = true,
    cols,
    orientation = "vertical",
    autoFocus = false,
  }: Options = {}
) {
  useEffect(() => {
    const root = containerRef.current;
    if (!autoFocus || !root) return;
    const items = getItems(root, selector);
    const target =
      items.find((el) => el.getAttribute("aria-pressed") === "true") ?? items[0];
    target?.focus();
  }, [containerRef, selector, autoFocus]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (!active || !root.contains(active)) return;
      const tag = (active as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const items = getItems(root, selector);
      const idx = items.indexOf(active as HTMLElement);
      if (idx === -1) return;

      // real column count, so 2-column layouts on small screens work too
      const columns =
        orientation === "grid"
          ? (cols ??
            Math.max(
              1,
              getComputedStyle(root).gridTemplateColumns.split(" ").length
            ))
          : 1;

      let next = -1;
      switch (e.key) {
        case "ArrowUp":
          next = orientation === "grid" ? idx - columns : idx - 1;
          break;
        case "ArrowDown":
          next = orientation === "grid" ? idx + columns : idx + 1;
          break;
        case "ArrowLeft":
          if (orientation === "grid" || orientation === "horizontal") next = idx - 1;
          else return;
          break;
        case "ArrowRight":
          if (orientation === "grid" || orientation === "horizontal") next = idx + 1;
          else return;
          break;
        default:
          return;
      }

      if (next < 0) next = wrap ? items.length - 1 : 0;
      if (next >= items.length) next = wrap ? 0 : items.length - 1;
      if (next < 0 || next >= items.length) return;

      e.preventDefault();
      items[next]?.focus();
    };

    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [containerRef, selector, wrap, cols, orientation]);
}