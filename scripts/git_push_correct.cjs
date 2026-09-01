require('dotenv').config();
const { execSync } = require('child_process');

const token = process.env.GH_TOKEN;
const repo = 'github.com/mktfun/mec-nica-financeiro.git';
const url = `https://x-access-token:${token}@${repo}`;

console.log('Pushing...');
try {
  execSync(`git push ${url} main`, { stdio: 'inherit' });
  console.log('Push successful');
} catch (e) {
  console.error('Push failed:', e.message);
}
