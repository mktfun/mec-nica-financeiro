require('dotenv').config();
const { execSync } = require('child_process');

console.log('Configuring git user...');
execSync('git config user.email "ai@clawhub.com"');
execSync('git config user.name "ClawHub Agent"');

console.log('Staging files...');
execSync('git add .');

console.log('Committing...');
try {
  execSync('git commit -m "feat(279): correcao do fechamento por filial, agregacao canonica e calculo de diferenca por loja"');
} catch (e) {
  console.log('Commit note:', e.message);
}

console.log('Pushing to GitHub...');
const remoteUrl = execSync('git config --get remote.origin.url').toString().trim();
const token = process.env.GH_TOKEN;
let authenticatedUrl = remoteUrl;
if (token && remoteUrl.startsWith('https://github.com/')) {
  authenticatedUrl = remoteUrl.replace('https://github.com/', `https://x-access-token:${token}@github.com/`);
}

execSync(`git push ${authenticatedUrl} main`);
console.log('PUSH COMPLETED SUCCESSFULLY!');
