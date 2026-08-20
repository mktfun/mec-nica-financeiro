const { execSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
let ghToken = '';
envFile.split('\n').forEach(l => {
  if (l.startsWith('GH_TOKEN=')) {
    ghToken = l.split('=')[1].trim().replace(/"/g, '');
  }
});

if (!ghToken && fs.existsSync('.agent/.env_agent')) {
  const agentEnv = fs.readFileSync('.agent/.env_agent', 'utf8');
  agentEnv.split('\n').forEach(l => {
    if (l.startsWith('GH_TOKEN=')) {
      ghToken = l.split('=')[1].trim().replace(/"/g, '');
    }
  });
}

function run(cmd) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
}

try {
  run('git add -A');
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    run('git commit -m "docs: adicionar guia oficial da conciliacao financeira"');
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    let authedUrl = remoteUrl;
    if (ghToken && remoteUrl.includes('github.com')) {
      const parts = remoteUrl.split('github.com/');
      if (parts.length > 1) {
        authedUrl = `https://x-access-token:${ghToken}@github.com/${parts[1]}`;
      }
    }
    run(`git push "${authedUrl}" HEAD:main`);
    run(`git push "${authedUrl}" HEAD:master`);
    console.log('Docs committed and pushed!');
  } else {
    console.log('Working tree clean, nothing to commit.');
  }
} catch (e) {
  console.error('Git error:', e.message);
  process.exit(1);
}
