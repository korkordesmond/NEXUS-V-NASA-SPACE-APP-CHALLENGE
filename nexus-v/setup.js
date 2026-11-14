import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const root = process.cwd();

console.log('\n🚀 Initializing Nexus-V Mission Control Setup...');
console.log('==============================================');

// 1. Check Node Version
const nodeVersion = process.version.replace('v', '').split('.')[0];
if (parseInt(nodeVersion) < 18) {
  console.error('❌ Error: Node.js v18 or higher is required.');
  console.error(`   Current version: ${process.version}`);
  process.exit(1);
}
console.log(`✅ Node.js detected: ${process.version}`);

// 2. Install Dependencies
try {
  console.log('\n📦 Installing dependencies (Frontend + Backend)...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed.');
} catch (error) {
  console.error('❌ Failed to install dependencies.');
  process.exit(1);
}

// 3. Setup Environment Variables
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) {
  console.log('\n⚙️  Creating .env file...');
  const envContent = `# --- Backend Variables (Read by Express) ---
PORT=3000
CLIENT_URL=http://localhost:5173

# --- Frontend Variables (Read by Vite, MUST start with VITE_) ---
VITE_API_URL=http://localhost:3000
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env created successfully.');
} else {
  console.log('\nℹ️  .env file already exists. Skipping creation.');
}

console.log('\n==============================================');
console.log('🎉 Setup Complete! Nexus-V is ready for launch.\n');
console.log('To start the application, you need TWO terminals:\n');
console.log('Terminal 1 (Backend API):');
console.log('  npm run dev:server\n');
console.log('Terminal 2 (Frontend Client):');
console.log('  npm run dev\n');
console.log('Then open http://localhost:5173 in your browser.');
console.log('==============================================\n');