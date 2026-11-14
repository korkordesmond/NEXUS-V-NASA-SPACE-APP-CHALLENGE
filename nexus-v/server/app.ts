import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'crypto';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

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

// In-memory database (cleared on every restart or redeploy)
const teams = new Map<string, Team>();

// Newer @types/express types route params as string | string[],
// so read the team code through one helper that always returns a string.
const codeOf = (req: Request): string => String(req.params.code).toUpperCase();

// ==========================================
// 1. Health Check Endpoint
// ==========================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Nexus-V Backend is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeTeams: teams.size,
  });
});

// ==========================================
// 2. Create a Team
// ==========================================
app.post('/api/teams', (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ error: 'Team name must be at least 3 characters.' });
  }

  const code = crypto.randomBytes(3).toString('hex').toUpperCase();

  const captain: Member = {
    id: crypto.randomUUID(),
    name: 'Captain',
    isCaptain: true,
  };

  const newTeam: Team = {
    code,
    name: name.trim(),
    members: [captain],
    started: false,
  };

  teams.set(code, newTeam);

  res.status(201).json({ team: newTeam, memberId: captain.id });
});

// ==========================================
// 3. Get Team (Used by polling)
// ==========================================
app.get('/api/teams/:code', (req: Request, res: Response) => {
  const team = teams.get(codeOf(req));

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  res.json({ team });
});

// ==========================================
// 4. Join a Team
// ==========================================
app.post('/api/teams/:code/join', (req: Request, res: Response) => {
  const { name } = req.body;
  const team = teams.get(codeOf(req));

  if (!team) {
    return res.status(404).json({ error: 'not-found' });
  }
  if (team.started) {
    return res.status(403).json({ error: 'started' });
  }
  if (team.members.length >= MAX_MEMBERS) {
    return res.status(400).json({ error: 'full' });
  }

  const newMember: Member = {
    id: crypto.randomUUID(),
    name: name || `Player ${team.members.length + 1}`,
    isCaptain: false,
  };

  team.members.push(newMember);

  res.json({ team, memberId: newMember.id });
});

// ==========================================
// 5. Start the Team
// ==========================================
app.post('/api/teams/:code/start', (req: Request, res: Response) => {
  const team = teams.get(codeOf(req));

  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  team.started = true;
  res.json({ team });
});

export default app;