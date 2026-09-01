import os
import subprocess

env_vars = {}
with open('.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip(' "\'')

print('1. Setting git identity...')
subprocess.run(['git', 'config', 'user.email', 'ai@clawhub.com'], check=True)
subprocess.run(['git', 'config', 'user.name', 'ClawHub Agent'], check=True)

print('2. Staging files...')
subprocess.run(['git', 'add', '.'], check=True)

print('3. Committing...')
msg = 'feat(315): correcao critica da rpc de conciliacao, calculo de faturamento e blindagem de snapshots'
subprocess.run(['git', 'commit', '-m', msg], check=True)

print('4. Pushing to origin main...')
gh_token = env_vars.get('GH_TOKEN')
remote_url = f'https://x-access-token:{gh_token}@github.com/mktfun/mec-nica-financeiro.git'
subprocess.run(['git', 'push', remote_url, 'main'], check=True)

print('5. Commit hash:')
res = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True)
print(res.stdout.strip())
