# Nexus V

A web game where players **plan, build and launch a real space mission**, then get feedback on why it succeeded or failed. Built for the NASA Space Apps Challenge, "Space Mission Design Game".

Pick a budget and a planet, choose a mission type, assemble a spacecraft from parts based on real missions, and run it against real-world limits: mass, power, speed change (delta-v), radio reach and cost.

## Status

| Stage | State |
|---|---|
| Landing (tutorial) | Done |
| Plan (budget, planet, mission type) | Done |
| Build (assemble the spacecraft) | Done, being tuned |
| Launch (simulation) | In progress |
| Score and feedback | In progress |
| Team creation and multiplayer | Planned |

## Tech stack

- [Vite](https://vite.dev) + [React](https://react.dev) + TypeScript
- [React Router](https://reactrouter.com) for the five full-screen pages
- [Tailwind CSS](https://tailwindcss.com) v4 for styling
- No backend: everything runs in the browser

## Setup on your device

You need **Git** and **Node.js 20 or newer** (the LTS version is fine). npm comes with Node.

### 1. Install Node.js

- **Windows:** download the LTS installer from [nodejs.org](https://nodejs.org).
- **macOS:** the same installer, or `brew install node`.
- **Linux (including Linux Mint):** install [nvm](https://github.com/nvm-sh/nvm), then run `nvm install --lts`.

Check it worked:

```bash
node -v    # v20 or higher
npm -v
git --version
```

### 2. Get the code and run it

```bash
git clone git@github.com:korkordesmond/nexus-v.git
cd nexus-v
npm install
npm run dev
```
Open the address that `npm run dev` prints (usually `http://localhost:5173`).

### 3. Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with live reload |
| `npm run dev -- --host` | Same, but also reachable from phones and laptops on your Wi-Fi (useful for demos) |
| `npm run build` | Type-check and build the production version into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Check the code style |

## How to play

1. **Plan:** enter a budget (in millions of dollars), choose a planet, then choose a mission: flyby, orbit, land, or orbit and return. Not every mission is possible everywhere. Neptune only allows a flyby, and only rocky worlds can be landed on.
2. **Build:** choose a launch vehicle, payload, power system, antenna and propulsion stage (plus a landing system for landings). Watch the limits on the left: if a bar turns red, that limit is broken.
3. **Launch:** watch the mission run. *(in progress)*
4. **Feedback:** see your score and why the mission worked or failed. *(in progress)*

**Controls:** mouse, or keyboard with the arrow keys to move, `Enter` to select and continue, and `Backspace` or `Esc` to go back. A laptop or PC gives the best experience.

## How the limits work

All limits come from the planet and mission the player picked, using real spacecraft figures.

- **Mass:** the launch vehicle's capacity toward that planet. It drops the farther you go.
- **Delta-v:** the engine's efficiency and propellant go through the rocket equation. The trip needs course corrections, plus a braking burn for orbits, a second one to come home, or a landing burn where there is no air.
- **Power:** solar output falls with the square of the distance from the Sun, so solar wings fade at Jupiter and are useless at Saturn. Nuclear generators work anywhere.
- **Comms:** the antenna's reach must cover the farthest distance between Earth and the planet.
- **Budget:** parts, plus 30% for the spacecraft bus (structure, thermal, computer, attitude control), plus mission operations.

## Project structure

```
src/
  pages/          Landing, Plan, Build, Launch, Feedback (one full-screen page each)
  components/     Layout (shared header) and StageNav (chevron buttons)
  state/          MissionContext: the player's choices, shared across pages
  data/           mission.ts: planets, mission types, spacecraft parts
  lib/            resources.ts: the physics and limit calculations
  hooks/          useArrowNav: arrow-key movement in lists and grids
  keyboard/       KeyboardProvider: Enter and Back handling per page
  styles/         ui.ts: shared fonts and card styles
  stages.ts       Stage names used by the header
  index.css       Tailwind import and theme
```

Fonts (Inter, JetBrains Mono, Source Serif 4) load from Google Fonts, so the first load needs internet.

## Where to change what

- **Add or edit a planet, mission type or part:** `src/data/mission.ts`
- **Change how a limit is calculated:** `src/lib/resources.ts`
- **Change the look of a page:** the matching file in `src/pages/` (styling is Tailwind classes)

## About the data

Part and planet figures come from real missions: Perseverance, Juno, Cassini, MESSENGER, MRO, Magellan, Venus Express and Voyager 2, plus NASA's small spacecraft reports and published launch vehicle figures.

Parts marked with a `~` before the price include **estimates** (most costs, many dry masses, instrument power). Some mission figures (launch speeds and orbit insertion burns for Mercury, Jupiter, Saturn and Neptune) are not yet checked against a source. The comment blocks at the top of `mission.ts` list exactly which values are sourced and which are estimates. Please verify them before the final presentation.

## Working together

- Make a branch for each feature (`git checkout -b feature/launch-page`) and open a pull request instead of pushing to `main`.
- Run `git pull` before you start working, and commit small and often.
- Tell the team before editing `src/data/mission.ts` or `src/lib/resources.ts`. Everyone depends on them, so merge conflicts there are the most likely.
- Run `npm run build` before opening a pull request to catch type errors.
