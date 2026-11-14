import { useEffect, useState } from "react";

/**
 * Team storage + live updates.
 *
 * IMPORTANT: this version keeps teams in the browser's localStorage, so it only
 * syncs between tabs/windows of the SAME browser on the SAME computer. That is
 * enough to build and test the lobby. For players on different devices you need
 * a backend (REST + WebSocket, Firebase, Supabase, ...). Only the functions in
 * this file need to change; the pages don't care where the data lives.
 */

export const MAX_MEMBERS = 4;

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

const TEAMS_KEY = "nexusv:teams";
const ME_KEY = "nexusv:me";

function shortId(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function readAll(): Record<string, Team> {
    try {
        return JSON.parse(localStorage.getItem(TEAMS_KEY) ?? "{}");
    } catch {
        return {};
    }
}

function writeAll(teams: Record<string, Team>) {
    try {
        localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
    } catch {
        /* storage unavailable; ignore */
    }
}

/** "Who am I in this tab?" Uses sessionStorage so each tab is its own player. */
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
    } catch {
        /* ignore */
    }
}

export function getTeam(code: string): Team | null {
    return readAll()[code] ?? null;
}

export function createTeam(name: string): Team {
    const code = shortId();
    const captain: Member = { id: shortId(), name: "Captain", isCaptain: true };
    const team: Team = { code, name: name.trim(), members: [captain], started: false };

    const all = readAll();
    all[code] = team;
    writeAll(all);
    setMe(code, captain.id);
    return team;
}

export function joinTeam(code: string, playerName: string): JoinResult {
    const all = readAll();
    const team = all[code];
    if (!team) return { ok: false, reason: "not-found" };
    if (team.started) return { ok: false, reason: "started" };
    if (team.members.length >= MAX_MEMBERS) return { ok: false, reason: "full" };

    const member: Member = { id: shortId(), name: playerName.trim(), isCaptain: false };
    team.members.push(member);
    writeAll(all);
    setMe(code, member.id);
    return { ok: true, team, memberId: member.id };
}

/** The captain can start at any time, even with fewer than MAX_MEMBERS players. */
export function startTeam(code: string) {
    const all = readAll();
    if (!all[code]) return;
    all[code].started = true;
    writeAll(all);
}

/** Live view of a team. Updates when another tab changes it. */
export function useTeam(code: string | undefined): Team | null {
    const [team, setTeam] = useState<Team | null>(() => (code ? getTeam(code) : null));

    useEffect(() => {
        if (!code) {
            setTeam(null);
            return;
        }

        const refresh = () => {
            const next = getTeam(code);
            setTeam((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        };

        refresh();
        const onStorage = (e: StorageEvent) => {
            if (e.key === TEAMS_KEY || e.key === null) refresh();
        };
        window.addEventListener("storage", onStorage);
        // polling as a safety net (and the same shape a backend version would use)
        const id = setInterval(refresh, 1500);

        return () => {
            window.removeEventListener("storage", onStorage);
            clearInterval(id);
        };
    }, [code]);

    return team;
}