const { execSync } = require('child_process');
const fs = require('fs');

const agentEnvFile = fs.readFileSync('.agent/.env_agent', 'utf8');
const env = {};
agentEnvFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.substring(1, v.length - 1);
    env[k] = v;
  }
});

const token = env.GH_TOKEN;
const repo = 'mktfun/mec-nica-financeiro';
const remoteUrl = `https://x-access-token:${token}@github.com/${repo}.git`;

try {
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "fix: import useQueryClient in UserManagementPanel"', { stdio: 'inherit' });
  execSync(`git push ${remoteUrl} main:main`, { stdio: 'inherit' });
  execSync(`git push ${remoteUrl} main:master`, { stdio: 'inherit' });
  console.log('Push complete to main and master!');
} catch (e) {
  console.error('Git error:', e.message);
}
