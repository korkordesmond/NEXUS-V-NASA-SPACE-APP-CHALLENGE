// server.js
import dotenv from 'dotenv';
dotenv.config(); // Load env vars BEFORE importing app

// Dynamic import ensures env vars are set before app.js runs
const { default: app } = await import('./app.js');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Nexus-V Backend running on port ${PORT}`);
});