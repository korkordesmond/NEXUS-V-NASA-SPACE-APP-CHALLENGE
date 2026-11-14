import type { Member } from "../lib/teamStore";

const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";

interface Props {
    members: Member[];
    max: number;
    meId?: string | null;
}

export default function MemberSlots({ members, max, meId }: Props) {
    const slots: (Member | null)[] = Array.from({ length: max }, (_, i) => members[i] ?? null);

    return (
        <div style={{ fontFamily: SANS }}>
            <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-medium tracking-wide text-cyan-300">Crew</span>
                <span className="text-slate-400">
                    {members.length} / {max} joined
                </span>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
                {slots.map((m, i) =>
                    m ? (
                        <li
                            key={m.id}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                        >
                            <span className="flex size-8 items-center justify-center rounded-full bg-cyan-400/20 text-sm font-semibold text-cyan-200">
                                {m.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="flex-1 truncate text-sm text-slate-100">
                                {m.name}
                                {m.id === meId && <span className="ml-2 text-slate-500">(you)</span>}
                            </span>
                            {m.isCaptain && (
                                <span className="rounded-md bg-cyan-400/10 px-2 py-0.5 text-xs text-cyan-300">
                                    Captain
                                </span>
                            )}
                        </li>
                    ) : (
                        <li
                            key={`empty-${i}`}
                            className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-sm text-slate-600"
                        >
                            <span className="size-8 rounded-full border border-dashed border-white/10" />
                            Waiting for player…
                        </li>
                    )
                )}
            </ul>
        </div>
    );
}