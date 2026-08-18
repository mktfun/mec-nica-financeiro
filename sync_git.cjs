const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.substring(1, v.length - 1);
    env[k] = v;
  }
});

const token = env.GH_TOKEN;
if (token) {
  process.env.GH_TOKEN = token;
  process.env.GITHUB_TOKEN = token;
}

try {
  execSync('git add -A', { stdio: 'inherit' });
  execSync('git stash', { stdio: 'inherit' });
  execSync('git pull origin main', { stdio: 'inherit' });
  try {
    execSync('git stash pop', { stdio: 'inherit' });
  } catch (e) {
    console.log('Stash pop note:', e.message);
  }
  execSync('git add -A', { stdio: 'inherit' });
  try {
    execSync('git commit -m "feat(227): dashboard PostgreSQL RPC integration and clean macro series"', { stdio: 'inherit' });
  } catch (e) {}
  execSync('git push origin main', { stdio: 'inherit' });
  execSync('git push origin main:master --force', { stdio: 'inherit' });
  console.log('Sync complete!');
} catch (err) {
  console.error('Git error:', err.message);
}
