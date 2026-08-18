const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const specsDir = path.join(__dirname, 'specs');
const archiveDir = path.join(specsDir, 'archive');
const folder = '234-conciliacao-maquininhas-nao-entradas-e-saldo-compensar';

const src = path.join(specsDir, folder);
const dst = path.join(archiveDir, folder);

if (fs.existsSync(src)) {
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  fs.renameSync(src, dst);
  console.log(`Archived ${folder} -> specs/archive/${folder}`);
}

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
  execSync('git commit -m "feat(spec-234): conciliacao tripla de maquininhas, saldo a compensar no backend e batimento OFX"', { stdio: 'inherit' });
  execSync(`git push ${remoteUrl} main:main`, { stdio: 'inherit' });
  execSync(`git push ${remoteUrl} main:master`, { stdio: 'inherit' });
  console.log('Push complete to main and master!');
} catch (e) {
  console.error('Git error:', e.message);
}
