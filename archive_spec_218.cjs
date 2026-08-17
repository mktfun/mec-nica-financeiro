const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'specs', '218-tela-dedicada-taxas-juros-mdr-maquininhas');
const destDir = path.join(__dirname, 'specs', 'archive', '218-tela-dedicada-taxas-juros-mdr-maquininhas');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const files = fs.readdirSync(srcDir);
  for (const f of files) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
    fs.unlinkSync(path.join(srcDir, f));
  }
  fs.rmdirSync(srcDir);
  console.log('Spec 218 moved to specs/archive/218-tela-dedicada-taxas-juros-mdr-maquininhas successfully!');
} else {
  console.log('Spec 218 source dir not found or already moved.');
}

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx !== -1) {
    const k = line.substring(0, idx).trim();
    const v = line.substring(idx + 1).trim();
    env[k] = v;
  }
});

const token = env.GH_TOKEN;
if (token) {
  process.env.GH_TOKEN = token;
  process.env.GITHUB_TOKEN = token;
}

try {
  console.log('Staging changes...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('Committing archive...');
  const msg = 'feat(218): archive dedicated fees and mdr rates page spec';
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

  console.log('Pushing to main...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('Pushing to master...');
  execSync('git push origin main:master --force', { stdio: 'inherit' });

  console.log('Archived and pushed successfully!');
} catch (err) {
  console.error('Git error:', err.message);
}
