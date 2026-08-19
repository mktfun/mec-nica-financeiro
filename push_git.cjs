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
  run('git commit -m "feat(spec-238-239): rpc limpeza geral, desbloqueio de datas, modal maquininhas 2xl e redesign dos cards de lojas"');
  
  const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  console.log('Current remote URL:', remoteUrl);
  
  if (ghToken) {
    let authedUrl = remoteUrl;
    if (remoteUrl.includes('github.com')) {
      const parts = remoteUrl.split('github.com/');
      if (parts.length > 1) {
        authedUrl = `https://x-access-token:${ghToken}@github.com/${parts[1]}`;
      }
    }
    run(`git push "${authedUrl}" HEAD:main`);
    run(`git push "${authedUrl}" HEAD:master`);
  } else {
    run('git push origin HEAD:main');
    run('git push origin HEAD:master');
  }
  console.log('Successfully pushed to main and master!');
} catch (e) {
  console.error('Git error:', e.message);
  process.exit(1);
}
