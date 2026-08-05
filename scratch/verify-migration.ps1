$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q"
$body = '{"email":"mktfunil1@gmail.com","password":"Mktfunil8563*"}'
$auth = Invoke-RestMethod "https://cnwzsvowkfymtdiryhqc.supabase.co/auth/v1/token?grant_type=password" -Method POST -ContentType "application/json" -Body $body -Headers @{"apikey"=$apiKey}
$tok = $auth.access_token
$h = @{"apikey"=$apiKey;"Authorization"="Bearer $tok"}

$baseUrl = "https://cnwzsvowkfymtdiryhqc.supabase.co"

Write-Host "=== VERIFICACAO POS-MIGRACAO ==="
$recs = Invoke-RestMethod "${baseUrl}/rest/v1/reconciliations?select=store_id,bank_total,date" -Headers $h
Write-Host "Total: $($recs.Count)"

$soma = ($recs | ForEach-Object { [decimal]$_.bank_total } | Measure-Object -Sum).Sum
Write-Host "SOMA bank_total: R$ $soma"
Write-Host "Esperado: ~121307"
Write-Host ""

# Separar pelo dia mais recente
$today = $recs | Where-Object { $_.date -eq "2026-08-05" }
$somaHoje = ($today | ForEach-Object { [decimal]$_.bank_total } | Measure-Object -Sum).Sum
Write-Host "=== SALDO DIA 05/08 (deve ser ~R$ 121.307) ==="
Write-Host "Soma: R$ $somaHoje"
foreach ($r in $today) {
    Write-Host "  $($r.store_id): R$ $($r.bank_total)"
}

Write-Host ""
Write-Host "=== CENARIO 1: st-01 deve ser ~19314 ==="
$st01 = $recs | Where-Object { $_.store_id -eq "st-01" -and $_.date -eq "2026-08-05" }
Write-Host "  st-01 bank_total: $($st01.bank_total)"
if ([decimal]$st01.bank_total -gt 100 -and [decimal]$st01.bank_total -lt 100000) {
    Write-Host "  ✅ CORRETO - está em reais agora"
} else {
    Write-Host "  ❌ Ainda suspeito"
}
