import { useEffect, useState } from "react";

export const MAX_MEMBERS = 4;

// Explicitly append /api to the base URL
const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

export interface Member {
  id: string;
  name: string;
  isCaptain: boolean;
}

export interface Team {
  code: string;
  name: string;
  members: Member[];
  started: boolean;
}

export type JoinResult =
  | { ok: true; team: Team; memberId: string }
  | { ok: false; reason: "not-found" | "full" | "started" };

const ME_KEY = "nexusv:me";

export function getMe(): { code: string; memberId: string } | null {
  try {
    return JSON.parse(sessionStorage.getItem(ME_KEY) ?? "null");
  } catch {
    return null;
  }
}

function setMe(code: string, memberId: string) {
  try {
    sessionStorage.setItem(ME_KEY, JSON.stringify({ code, memberId }));
  } catch { /* ignore */ }
}

export async function createTeam(name: string): Promise<Team> {
  const res = await fetch(`${API_URL}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  
  if (!res.ok) throw new Error('Failed to create team');
  
  const data = await res.json();
  setMe(data.team.code, data.memberId);
  return data.team;
}

export async function joinTeam(code: string, playerName: string): Promise<JoinResult> {
  try {
    const res = await fetch(`${API_URL}/teams/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: playerName })
    });

    if (!res.ok) {
      if (res.status === 404) return { ok: false, reason: "not-found" };
      if (res.status === 403) return { ok: false, reason: "started" };
      if (res.status === 400) return { ok: false, reason: "full" };
      throw new Error('Unknown error');
    }

    const data = await res.json();
    setMe(code, data.memberId);
    return { ok: true, team: data.team, memberId: data.memberId };
  } catch (err) {
    return { ok: false, reason: "not-found" };
  }
}

export async function startTeam(code: string): Promise<void> {
  await fetch(`${API_URL}/teams/${code}/start`, { method: 'POST' });
}

export async function getTeam(code: string): Promise<Team | null> {
  try {
    const res = await fetch(`${API_URL}/teams/${code}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.team;
  } catch {
    return null;
  }
}

export function useTeam(code: string | undefined): Team | null {
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!code) {
      setTeam(null);
      return;
    }

    let isMounted = true;

    const refresh = async () => {
      const next = await getTeam(code);
      if (isMounted) {
        setTeam((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      }
    };

    refresh();
    const id = setInterval(refresh, 1500);

    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, [code]);

  return team;
}