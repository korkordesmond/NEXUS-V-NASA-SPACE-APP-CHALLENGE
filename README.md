# 🚀 Nexus-V: Multiplayer Mission Control

**Plan, build, and launch a real space mission together, then find out why it succeeded or failed.**

Nexus-V is a web game built for the NASA Space Apps Challenge, *Space Mission Design Game*. Unlike single-player simulators, it puts **collaboration and communication** at the center: players share a live lobby, build the spacecraft as a team, and face in-flight anomalies that demand quick, joint decisions.

---

## 📖 How to Play

1. **Create or join a team.** Generate an invite link and share it. Teammates sync into your lobby in real time.
2. **Plan.** Set a budget (in millions of dollars), choose a planet, then choose a mission type: flyby, orbit, land, or orbit and return. Not every mission is possible everywhere (Neptune, for example, allows only a flyby).
3. **Build.** Choose a launch vehicle, payload, power system, antenna, and propulsion stage. Watch the limit bars on the left: a red bar means that limit is broken.
4. **Launch.** Watch the mission unfold in real time. When an anomaly strikes, decide with your team how to save the mission.
5. **Feedback.** Review your final score and your decisions, and learn why the mission worked or failed.

**Controls:** Mouse, or keyboard: arrow keys to move, `Enter` to select and continue, `Backspace` or `Esc` to go back.

## ✨ Key Features

- **Multiplayer lobby:** Create a team, share an invite link, and collaborate live through session polling.
- **Realistic physics:** Delta-v calculations, Keplerian orbital mechanics, and light-time communication delay.
- **Meaningful build phase:** Balance mass, power, fuel, and budget using components modeled on real missions (Perseverance, Juno, Cassini, and more).
- **Dynamic flight events:** Mid-flight anomalies such as solar flares and thruster failures, where the team votes on the response.
- **"Cyber-cockpit" interface:** A retro-futuristic pixel-art UI designed for immersion.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Vite](https://vite.dev), [React](https://react.dev), TypeScript, [React Router](https://reactrouter.com), [Tailwind CSS v4](https://tailwindcss.com) |
| Backend | Node.js, Express, TypeScript (multiplayer state management) |
| Physics / math | Custom TypeScript modules for orbital transfers, the rocket equation, and resource management |

---

## 🚀 Setup Guide (for Judges and Developers)

**Requirements:** [Git](https://git-scm.com) and [Node.js](https://nodejs.org) 20 or newer. Works on Windows, macOS, and Linux.

### 1. Get the code

```bash
git clone https://github.com/korkordesmond/NEXUS-V-NASA-SPACE-APP-CHALLENGE.git
cd NEXUS-V-NASA-SPACE-APP-CHALLENGE/nexus-v
```

### 2. Run the automated setup

A cross-platform Node.js script installs all dependencies and generates the `.env` file with the correct ports. No Bash or WSL required.

```bash
npm run setup
```

> If your `package.json` has no `setup` script, run `node setup.js` directly. It does the same thing.

### 3. Start the application

Nexus-V uses a dedicated Express backend for multiplayer state, so two processes must run at the same time.

**Terminal 1: backend API** (runs on `http://localhost:3000`)

```bash
npm run dev:server
```

**Terminal 2: frontend client** (runs on `http://localhost:5173`)

```bash
npm run dev
```

### 🎮 Testing multiplayer (for judges)

1. Open `http://localhost:5173` in your normal browser window.
2. Click **Initialize Team**, enter a name, and copy the generated **Invite Link**.
3. Open an **Incognito window** (or a different browser) and paste the invite link.
4. Both windows sync in real time. Once both players are in the lobby, click **Launch Mission** to move on to the planning phase.

---

## 🧠 How the Physics and Limits Work

Every limit is derived from the planet and mission the player chose, using real spacecraft figures.

| Limit | How it works |
|---|---|
| **Mass** | The launch vehicle's capacity toward the chosen planet. It shrinks the farther you travel. |
| **Delta-v (Δv)** | Engine efficiency and propellant feed into the rocket equation. The trip needs course corrections, plus a braking burn for orbits, a second burn to return home, or a landing burn where there is no atmosphere. |
| **Power** | Solar output falls with the square of the distance from the Sun: solar wings fade at Jupiter and are useless at Saturn. Nuclear generators (RTGs) work anywhere. |
| **Comms** | The antenna's range must cover the greatest Earth-to-planet distance during the mission. |
| **Budget** | Parts, plus 30% for the spacecraft bus (structure, thermal, computer, attitude control), plus mission operations. |

## 📂 Project Structure

```text
nexus-v/
├── server/               # Express backend API
│   ├── app.ts            # API routes, health check, in-memory database
│   └── server.ts         # Server entry point
├── src/                  # React frontend
│   ├── components/       # Layout, StageNav (chevron buttons), etc.
│   ├── data/             # mission.ts: planets, mission types, parts
│   ├── hooks/            # useArrowNav: arrow-key movement
│   ├── keyboard/         # KeyboardProvider: Enter/Back handling
│   ├── lib/              # resources.ts (physics), teamStore.ts (API)
│   ├── pages/            # Landing, Plan, Build, Launch, Feedback
│   ├── state/            # MissionContext: the player's choices
│   └── styles/           # ui.ts: shared fonts and pixel UI styles
├── setup.js              # Cross-platform automated setup script
├── .env                  # Environment variables (created by setup)
├── vite.config.ts        # Vite config and Tailwind plugin
└── package.json          # Dependencies and scripts
```

## 📚 About the Data

Part and planet figures come from real missions (Perseverance, Juno, Cassini, MESSENGER, MRO, Magellan, Venus Express, and Voyager 2), along with NASA small-spacecraft reports and published launch vehicle specifications.

A `~` before a price marks an **estimate**. Most costs, many dry masses, and instrument power figures are estimated. The comment blocks at the top of `mission.ts` list exactly which values are sourced and which are estimated.