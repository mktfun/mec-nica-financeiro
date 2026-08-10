graphify update
Move-Item "specs\152-manual-expenses" "specs\archive\152-manual-expenses" -Force -ErrorAction SilentlyContinue

$lines = Get-Content .env
$tokenLine = $lines | Where-Object { $_ -match '^GH_TOKEN=' } | Select-Object -Last 1
$ghToken = $tokenLine.Substring('GH_TOKEN='.Length).Trim().Trim('"')
$env:GH_TOKEN = $ghToken

git add .
git commit -m "feat(152): manual expenses input for conciliation instead of generic ofx sum"
git push origin main
