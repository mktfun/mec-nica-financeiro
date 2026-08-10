$lines = Get-Content .env
$tokenLine = $lines | Where-Object { $_ -match '^SUPABASE_ACCESS_TOKEN=' } | Select-Object -Last 1
$token = $tokenLine.Substring('SUPABASE_ACCESS_TOKEN='.Length).Trim().Trim('"')
Write-Host "Token prefix: $($token.Substring(0,10))"
$env:SUPABASE_ACCESS_TOKEN = $token
cmd.exe /c "supabase db push --linked --yes 2>&1"
