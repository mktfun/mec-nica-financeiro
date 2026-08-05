$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q"

$loginData = @{
    email = "mktfunil1@gmail.com"
    password = "Mktfunil8563*"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/auth/v1/token?grant_type=password" -Method Post -Body $loginData -Headers @{
    "apikey" = $apiKey
    "Content-Type" = "application/json"
}
$accessToken = $loginResponse.access_token
$h = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $accessToken"
    "Prefer" = "count=exact"
}

Write-Host "=== COM AUTH DE USUARIO ==="

# Counts
$rResp = Invoke-WebRequest -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/reconciliations?select=id&limit=1" -Headers $h
Write-Host "reconciliations count: $($rResp.Headers.'Content-Range')"

$tResp = Invoke-WebRequest -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/transactions?select=id&limit=1" -Headers $h
Write-Host "transactions count: $($tResp.Headers.'Content-Range')"

$pResp = Invoke-WebRequest -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/patio_os?select=id&limit=1" -Headers $h
Write-Host "patio_os count: $($pResp.Headers.'Content-Range')"

$dResp = Invoke-WebRequest -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/daily_snapshots?select=id&limit=1" -Headers $h
Write-Host "daily_snapshots count: $($dResp.Headers.'Content-Range')"

# Reconciliations detalhadas
Write-Host ""
Write-Host "=== RECONCILIATIONS (com auth) primeiras 30 ==="
$h2 = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $accessToken"
}
$recs = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/reconciliations?select=store_id,bank_total,date&order=date.desc&limit=30" -Headers $h2
Write-Host "Rows: $($recs.Count)"
foreach ($r in $recs) {
    Write-Host "  $($r.date) | $($r.store_id) | bank_total: $($r.bank_total)"
}

# Transactions sample
Write-Host ""
Write-Host "=== TRANSACTIONS AMOSTRA (ultimas 10) ==="
$txs = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/transactions?select=id,store_id,amount,type,target_date,source&order=target_date.desc&limit=10" -Headers $h2
Write-Host "Rows: $($txs.Count)"
foreach ($t in $txs) {
    Write-Host "  $($t.target_date) | store: $($t.store_id) | source: $($t.source) | type: $($t.type) | amount: $($t.amount)"
}

# Daily snapshots
Write-Host ""
Write-Host "=== DAILY_SNAPSHOTS (com auth) primeiras 10 ==="
$snaps = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/daily_snapshots?select=*&limit=10" -Headers $h2
Write-Host "Rows: $($snaps.Count)"
foreach ($s in $snaps) {
    Write-Host "  date: $($s.date) | dinheiro_mp: $($s.dinheiro_mp) | a_receber_manual: $($s.a_receber_manual) | contas_a_pagar: $($s.contas_a_pagar) | store_id: $($s.store_id)"
}
