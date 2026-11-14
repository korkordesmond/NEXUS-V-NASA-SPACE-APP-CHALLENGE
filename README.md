# 🚀 Nexus-V: Multiplayer Mission Control

A web game where players **plan, build, and launch a real space mission**, then get feedback on why it succeeded or failed. Built for the NASA Space Apps Challenge, "Space Mission Design Game".

Unlike single-player simulators, Nexus-V emphasizes **collaboration and communication**. Players share a live lobby, build the craft together, and face critical in-flight anomalies that require split-second decisions.

## 📖 How to Play
1. **Create/Join a Team:** Generate an invite link and share it. Teammates will sync into your lobby in real-time.
2. **Plan:** Enter a budget (in millions of dollars), choose a planet, then choose a mission type: flyby, orbit, land, or orbit and return. Not every mission is possible everywhere (e.g., Neptune only allows a flyby).
3. **Build:** Choose a launch vehicle, payload, power system, antenna, and propulsion stage. Watch the limits on the left: if a bar turns red, that limit is broken.
4. **Launch:** Watch the mission run in real-time. Encounter anomalies and make split-second decisions with your team to save the mission.
5. **Feedback:** See your final score, review your decisions, and understand why the mission worked or failed.

**Controls:** Mouse, or keyboard with the arrow keys to move, `Enter` to select and continue, and `Backspace` or `Esc` to go back.

## ✨ Key Features
- **Multiplayer Lobby System:** Create a team, generate an invite link, and collaborate in real-time via session polling.
- **Realistic Physics Engine:** Built-in delta-V calculations, Keplerian orbital mechanics, and light-time delay communication simulations.
- **The Build Phase:** Manage mass, power, fuel, and budget while selecting components based on real missions (Perseverance, Juno, Cassini, etc.).
- **Dynamic Flight Events:** Encounter mid-flight anomalies (e.g., solar flares, thruster failures) where the team must vote on the best course of action.
- **Post-Flight Feedback:** A comprehensive scoring system grading the mission on spacecraft health, scientific data returned, and cost-effectiveness.
- **"Cyber-Cockpit" UI:** A retro-futuristic, pixelated UI designed to maximize immersion.

## 🛠️ Tech Stack
- **Frontend:** [Vite](https://vite.dev) + [React](https://react.dev) + TypeScript + [React Router](https://reactrouter.com) + [Tailwind CSS v4](https://tailwindcss.com)
- **Backend:** Node.js, Express, TypeScript (for multiplayer state management)
- **Physics/Math:** Custom TypeScript modules for orbital transfers, rocket equations, and resource management.

---

## 🚀 Setup Guide (For Judges & Developers)

You need **Git** and **Node.js 20 or newer**. It works on Windows, macOS, and Linux.

### 1. Get the code
```bash
git clone git@github.com:korkordesmond/nexus-v.git
cd nexus-v
