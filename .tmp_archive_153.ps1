graphify update
Move-Item "specs\153-raw-imports-excel" "specs\archive\153-raw-imports-excel" -Force -ErrorAction SilentlyContinue

$lines = Get-Content .env
$tokenLine = $lines | Where-Object { $_ -match '^GH_TOKEN=' } | Select-Object -Last 1
$ghToken = $tokenLine.Substring('GH_TOKEN='.Length).Trim().Trim('"')
$env:GH_TOKEN = $ghToken

git add .
git commit -m "feat(153): replace scattered batch badges with unified excel-like modal for raw imports"
git push origin main
