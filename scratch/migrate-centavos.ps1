$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q"
$body = '{"email":"mktfunil1@gmail.com","password":"Mktfunil8563*"}'
$auth = Invoke-RestMethod "https://cnwzsvowkfymtdiryhqc.supabase.co/auth/v1/token?grant_type=password" -Method POST -ContentType "application/json" -Body $body -Headers @{"apikey"=$apiKey}
$tok = $auth.access_token
$h = @{"apikey"=$apiKey;"Authorization"="Bearer $tok";"Content-Type"="application/json"}

$baseUrl = "https://cnwzsvowkfymtdiryhqc.supabase.co"

Write-Host "=== ANTES DA MIGRAÇÃO ==="
$recs = Invoke-RestMethod "${baseUrl}/rest/v1/reconciliations?select=store_id,bank_total,date" -Headers $h
Write-Host "Total reconciliations: $($recs.Count)"
$soma = ($recs | ForEach-Object { [decimal]$_.bank_total } | Measure-Object -Sum).Sum
Write-Host "SOMA ATUAL bank_total: $soma"
$recs | Select-Object -First 5 | ForEach-Object { Write-Host "  $($_.date) | $($_.store_id) | $($_.bank_total)" }

Write-Host ""
Write-Host "=== EXECUTANDO MIGRAÇÃO: bank_total / 100 ==="

$count = 0
foreach ($r in $recs) {
    $newVal = [Math]::Round([decimal]$r.bank_total / 100, 2)
    $patchBody = "{`"bank_total`": $newVal}"
    $storeId = $r.store_id
    $date = $r.date
    
    $patchUrl = "${baseUrl}/rest/v1/reconciliations?store_id=eq.${storeId}`&date=eq.${date}"
    Invoke-RestMethod $patchUrl -Method PATCH -Body $patchBody -Headers ($h + @{"Prefer"="return=minimal"}) | Out-Null
    
    $count++
    Write-Host "  OK: $date | $storeId | $($r.bank_total) -> $newVal"
}

Write-Host ""
Write-Host "=== VERIFICAÇÃO PÓS-MIGRAÇÃO ==="
$recsAfter = Invoke-RestMethod "${baseUrl}/rest/v1/reconciliations?select=store_id,bank_total,date" -Headers $h
$somaAfter = ($recsAfter | ForEach-Object { [decimal]$_.bank_total } | Measure-Object -Sum).Sum
Write-Host "SOMA APÓS bank_total: $somaAfter (esperado: ~121307)"
$recsAfter | ForEach-Object { Write-Host "  $($_.date) | $($_.store_id) | $($_.bank_total)" }
Write-Host ""
Write-Host "✅ Migração concluída. $count registros atualizados."
