const fs = require('fs');
const { execSync } = require('child_process');

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
  // Clean up any temp cjs scripts if existing
  ['apply_mdr_migration.cjs', 'view_rede_parser.cjs', 'inspect_pos_db.cjs', 'git_push_fix.cjs'].forEach(f => {
    if (fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch (e) {}
    }
  });

  console.log('Staging all changes...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('Committing changes...');
  const msg = 'feat(217): archive mdr fees audit and multi-store pos divergence analysis';
  execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });

  console.log('Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('Archive push completed successfully!');
} catch (err) {
  console.error('Git error:', err.message);
}
