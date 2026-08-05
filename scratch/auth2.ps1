param()

$url = "https://cnwzsvowkfymtdiryhqc.supabase.co"
$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q"

# Auth
$body = '{"email":"mktfunil1@gmail.com","password":"Mktfunil8563*"}'
$authResp = Invoke-RestMethod "$url/auth/v1/token?grant_type=password" -Method POST -ContentType "application/json" -Body $body -Headers @{"apikey"=$apiKey}
$tok = $authResp.access_token
Write-Host "Auth OK"

function Get-Table($table, $query) {
    $resp = Invoke-RestMethod "$url/rest/v1/${table}?${query}" -Headers @{"apikey"=$apiKey;"Authorization"="Bearer $tok"}
    return $resp
}

Write-Host "=== RECONCILIATIONS ==="
$recs = Get-Table "reconciliations" "select=store_id,bank_total,date&order=date.desc&limit=50"
Write-Host "Count: $($recs.Count)"
foreach ($r in $recs[0..9]) {
    Write-Host "  $($r.date) | $($r.store_id) | bank_total=$($r.bank_total)"
}

Write-Host ""
Write-Host "=== TRANSACTIONS AMOSTRA ==="
$txs = Get-Table "transactions" "select=id,store_id,amount,type,target_date,source&order=target_date.desc&limit=20"
Write-Host "Count na amostra: $($txs.Count)"
foreach ($t in $txs) {
    Write-Host "  $($t.target_date) | src=$($t.source) | type=$($t.type) | amount=$($t.amount) | store=$($t.store_id)"
}

Write-Host ""
Write-Host "=== DAILY_SNAPSHOTS ==="
$snaps = Get-Table "daily_snapshots" "select=date,store_id,dinheiro_mp,a_receber_manual,contas_a_pagar&limit=20"
Write-Host "Count: $($snaps.Count)"
foreach ($s in $snaps) {
    Write-Host "  date=$($s.date) | store=$($s.store_id) | dinheiro_mp=$($s.dinheiro_mp) | a_receber=$($s.a_receber_manual) | contas_pagar=$($s.contas_a_pagar)"
}

Write-Host ""
Write-Host "=== PATIO_OS ==="
$patio = Get-Table "patio_os" "select=id,store_id,total_value,status&limit=20"
Write-Host "Count: $($patio.Count)"
foreach ($p in $patio) {
    Write-Host "  store=$($p.store_id) | status=$($p.status) | total_value=$($p.total_value)"
}
