$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q"
$body = '{"email":"mktfunil1@gmail.com","password":"Mktfunil8563*"}'
$auth = Invoke-RestMethod "https://cnwzsvowkfymtdiryhqc.supabase.co/auth/v1/token?grant_type=password" -Method POST -ContentType "application/json" -Body $body -Headers @{"apikey"=$apiKey}
$tok = $auth.access_token
$h = @{"apikey"=$apiKey;"Authorization"="Bearer $tok"}

Write-Host "=== RECONCILIATIONS TODAS ==="
$recs = Invoke-RestMethod "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/reconciliations?select=*&limit=100" -Headers $h
Write-Host "Total: $($recs.Count)"
foreach ($r in $recs) {
    Write-Host "  $($r.date) | $($r.store_id) | bank_total=$($r.bank_total) | status=$($r.status)"
}

Write-Host ""
Write-Host "=== TRANSACTIONS POR STORE PARA BALANCO (sum) ==="
$txs = Invoke-RestMethod "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/transactions?select=store_id,amount,type,target_date,source&target_date=eq.2026-08-05&limit=500" -Headers $h
Write-Host "Total transactions 2026-08-05: $($txs.Count)"

$byStore = $txs | Group-Object store_id
foreach ($g in $byStore) {
    $inSum = ($g.Group | Where-Object { $_.type -eq "in" } | ForEach-Object { [decimal]$_.amount } | Measure-Object -Sum).Sum
    $outSum = ($g.Group | Where-Object { $_.type -eq "out" } | ForEach-Object { [decimal]$_.amount } | Measure-Object -Sum).Sum
    Write-Host "  Store: $($g.Name) | In: $inSum | Out: $outSum | Net: $($inSum + $outSum)"
}
