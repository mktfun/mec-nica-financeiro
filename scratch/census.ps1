$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q"
$h = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $apiKey"
}

Write-Host "=== PATIO_OS ==="
$patio = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/patio_os?select=id,store_id,total_value,paid_value,status&limit=100" -Headers $h
Write-Host "Total patio_os: $($patio.Count)"
if ($patio.Count -gt 0) {
    $totalValue = ($patio | ForEach-Object { [decimal]$_.total_value } | Measure-Object -Sum).Sum
    Write-Host "Soma total_value: $totalValue"
    $byStatus = $patio | Group-Object status
    foreach ($g in $byStatus) {
        $sum = ($g.Group | ForEach-Object { [decimal]$_.total_value } | Measure-Object -Sum).Sum
        Write-Host "  Status: $($g.Name) | Count: $($g.Count) | Total: $sum"
    }
}

Write-Host ""
Write-Host "=== DAILY_SNAPSHOTS ==="
$snaps = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/daily_snapshots?select=*&limit=50" -Headers $h
Write-Host "Total daily_snapshots: $($snaps.Count)"
foreach ($s in $snaps) {
    Write-Host "  date: $($s.date) | store_id: $($s.store_id) | dinheiro_mp: $($s.dinheiro_mp) | a_receber_manual: $($s.a_receber_manual) | contas_a_pagar: $($s.contas_a_pagar)"
}

Write-Host ""
Write-Host "=== IMPORT_LOGS ==="
$imps = Invoke-RestMethod -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/import_logs?select=*&order=target_date.desc&limit=20" -Headers $h
Write-Host "Total import_logs: $($imps.Count)"
foreach ($i in $imps) {
    Write-Host "  date: $($i.target_date) | store_id: $($i.store_id) | os_total: $($i.os_total)"
}

Write-Host ""
Write-Host "=== TRANSACTIONS (sem auth, conta geral) ==="
try {
    $txResp = Invoke-WebRequest -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/transactions?select=id&limit=1" -Headers ($h + @{"Prefer"="count=exact"})
    Write-Host "Content-Range: $($txResp.Headers.'Content-Range')"
} catch { Write-Host "Erro: $_" }

Write-Host ""
Write-Host "=== RECONCILIATIONS (sem auth, conta geral) ==="
try {
    $recResp = Invoke-WebRequest -Uri "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1/reconciliations?select=id&limit=1" -Headers ($h + @{"Prefer"="count=exact"})
    Write-Host "Content-Range: $($recResp.Headers.'Content-Range')"
} catch { Write-Host "Erro: $_" }
