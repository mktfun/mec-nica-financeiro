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

const specsToArchive = [
  '222-ajuste-tabela-cartao-rede-bruto-taxa-liquido-bandeira',
  '223-auditoria-status-liquidacao-cartao-e-pix-os',
  '224-conciliacao-atemporal-pix-ofx-centric',
  '225-justificativa-com-impacto-faturamento-e-redesign-vincular-os'
];

const archiveDir = path.join('specs', 'archive');
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

specsToArchive.forEach(spec => {
  const src = path.join('specs', spec);
  const dst = path.join(archiveDir, spec);
  if (fs.existsSync(src)) {
    if (fs.existsSync(dst)) {
      fs.rmSync(dst, { recursive: true, force: true });
    }
    fs.renameSync(src, dst);
    console.log(`Archived ${spec} -> specs/archive/${spec}`);
  }
});

try {
  console.log('Staging changes...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('Committing changes...');
  const msg = 'chore: archive specs 222, 223, 224, and 225';
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

  console.log('Pushing to main...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('Pushing to master...');
  execSync('git push origin main:master --force', { stdio: 'inherit' });

  console.log('Archive and push to main/master completed successfully!');
} catch (err) {
  console.error('Git error:', err.message);
}
