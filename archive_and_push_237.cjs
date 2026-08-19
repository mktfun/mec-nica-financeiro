const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = path.join(__dirname, 'specs', '237-redesign-visual-painel-resumo-dia-clean');
const destDir = path.join(__dirname, 'specs', 'archive', '237-redesign-visual-painel-resumo-dia-clean');

if (fs.existsSync(srcDir)) {
  if (!fs.existsSync(path.dirname(destDir))) {
    fs.mkdirSync(path.dirname(destDir), { recursive: true });
  }
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.renameSync(srcDir, destDir);
  console.log('Archived spec 237 to specs/archive/237-redesign-visual-painel-resumo-dia-clean');
}

// Read GH_TOKEN from .agent/.env_agent
const agentEnvPath = path.join(__dirname, '.agent', '.env_agent');
let ghToken = '';
if (fs.existsSync(agentEnvPath)) {
  const content = fs.readFileSync(agentEnvPath, 'utf8');
  content.split('\n').forEach(line => {
    if (line.startsWith('GH_TOKEN=')) {
      ghToken = line.replace('GH_TOKEN=', '').trim().replace(/^["']|["']$/g, '');
    }
  });
}

if (!ghToken) {
  console.error('GH_TOKEN not found in .agent/.env_agent');
  process.exit(1);
}

const remoteUrl = `https://${ghToken}@github.com/mktfun/mec-nica-financeiro.git`;

try {
  console.log('Adding files to git...');
  execSync('git add .', { stdio: 'inherit' });
  
  console.log('Creating commit...');
  execSync('git commit -m "feat(spec-237): redesign visual e descompressão do painel de fechamento"', { stdio: 'inherit' });
  
  console.log('Pushing to origin main...');
  execSync(`git push ${remoteUrl} HEAD:main`, { stdio: 'inherit' });
  
  console.log('Pushing to origin master...');
  execSync(`git push ${remoteUrl} HEAD:master`, { stdio: 'inherit' });
  
  console.log('Successfully pushed spec 237 to GitHub main and master!');
} catch (e) {
  console.error('Git error:', e.message);
  process.exit(1);
}
