const fs = require('fs');
const path = require('path');
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

const spec = '227-correcao-dashboard-grafico-evolucao-e-metricas-por-loja';
const archiveDir = path.join('specs', 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

const src = path.join('specs', spec);
const dst = path.join(archiveDir, spec);
if (fs.existsSync(src)) {
  if (fs.existsSync(dst)) {
    fs.rmSync(dst, { recursive: true, force: true });
  }
  fs.renameSync(src, dst);
  console.log(`Archived ${spec} -> specs/archive/${spec}`);
}

try {
  console.log('Staging changes...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('Committing changes...');
  const msg = 'feat(227): archive spec 227 and update global features.md';
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

  console.log('Pushing to main...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('Pushing to master...');
  execSync('git push origin main:master --force', { stdio: 'inherit' });

  console.log('Archive 227 completed successfully!');
} catch (err) {
  console.error('Git error:', err.message);
}
