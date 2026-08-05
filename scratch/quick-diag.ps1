$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q"
$h = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $apiKey"
}

Write-Host "=== RECONCILIATIONS ==="
$recs = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/reconciliations?select=store_id,bank_total,date&order=date.desc&limit=200" -Headers $h
Write-Host "Total rows: $($recs.Count)"
$byStore = $recs | Group-Object store_id
foreach ($g in $byStore) {
    $latest = $g.Group | Sort-Object date -Descending | Select-Object -First 1
    Write-Host "Store: $($g.Name) | Entries: $($g.Count) | Latest: $($latest.date) | bank_total: $($latest.bank_total)"
}

Write-Host ""
Write-Host "=== TRANSACTIONS COUNT POR DATA ==="
$dates = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/transactions?select=target_date&order=target_date.desc&limit=2000" -Headers $h
$byDate = $dates | Group-Object target_date | Sort-Object Name -Descending
foreach ($g in $byDate) {
    Write-Host "Data: $($g.Name) | Count: $($g.Count)"
}
