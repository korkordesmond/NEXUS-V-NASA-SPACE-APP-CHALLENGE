import { createContext, useContext, useState, type ReactNode } from "react";
import type { Part, Planet, Section, Task } from "../data/mission";
import type { FlightResult } from "../data/events";

export interface Mission {
  budget: number; // millions of USD
  planet: Planet | null;
  task: Task | null;
  orbitDays: number;
  parts: Partial<Record<Section, Part>>;
  /** Filled in by the Launch page when the flight ends; read by Feedback. */
  result: FlightResult | null;
}

const initial: Mission = {
  budget: 0,
  planet: null,
  task: null,
  orbitDays: 30,
  parts: {},
  result: null,
};

interface MissionContextValue {
  mission: Mission;
  update: (changes: Partial<Mission>) => void;
  reset: () => void;
}

const MissionContext = createContext<MissionContextValue | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [mission, setMission] = useState<Mission>(initial);

  const update = (changes: Partial<Mission>) =>
    setMission((m) => ({ ...m, ...changes }));
  const reset = () => setMission(initial);

  return (
    <MissionContext.Provider value={{ mission, update, reset }}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used inside MissionProvider");
  return ctx;
}