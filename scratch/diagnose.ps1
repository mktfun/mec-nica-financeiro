$url = "https://cnwzsvowkfymtdiryhqc.supabase.co/rest/v1"
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
$headers = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
    "Prefer" = "count=exact"
}

Write-Host "=== DIAGNOSTICO DO DASHBOARD ==="
Write-Host ""

# 1. Quantas reconciliations existem?
$recsResp = Invoke-WebRequest -Uri "$url/reconciliations?select=store_id,bank_total,date&order=date.desc&limit=100" -Headers $headers
$recs = $recsResp.Content | ConvertFrom-Json
Write-Host "Total reconciliations retornadas (lim 100): $($recs.Count)"

# 2. Valores de bank_total
Write-Host ""
Write-Host "=== RECONCILIATIONS (ultimas 20) ==="
$recs | Select-Object -First 20 | ForEach-Object {
    Write-Host "  Store: $($_.store_id) | Date: $($_.date) | bank_total: $($_.bank_total)"
}

# 3. Soma total de bank_total (o que o hook faz)
$totalBankSum = ($recs | ForEach-Object { [decimal]$_.bank_total } | Measure-Object -Sum).Sum
Write-Host ""
Write-Host "SOMA DOS BANK_TOTALS (sem dedup): R$ $totalBankSum"

# 4. Verificar duplicatas por store_id
Write-Host ""
Write-Host "=== STORES DISTINTOS COM bank_total ==="
$byStore = $recs | Group-Object store_id
foreach ($g in $byStore) {
    $latestRec = $g.Group | Sort-Object date -Descending | Select-Object -First 1
    Write-Host "  Store: $($g.Name) | Entries: $($g.Count) | Latest date: $($latestRec.date) | Latest bank_total: $($latestRec.bank_total)"
}

# 5. Qual o saldo real esperado (último registro por loja)
$expectedTotal = 0
foreach ($g in $byStore) {
    $latest = $g.Group | Sort-Object date -Descending | Select-Object -First 1
    $expectedTotal += [decimal]$latest.bank_total
}
Write-Host ""
Write-Host "SALDO ESPERADO (ultimo por loja): R$ $expectedTotal"

# 6. Contar total de transactions
$txCountResp = Invoke-WebRequest -Uri "$url/transactions?select=id&limit=1" -Headers ($headers + @{"Prefer" = "count=exact"})
$txCount = $txCountResp.Headers["Content-Range"]
Write-Host ""
Write-Host "=== TRANSACTIONS COUNT: $txCount ==="

# 7. Pegar transactions da data mais recente
$latestDate = $recs | Sort-Object date -Descending | Select-Object -First 1 -ExpandProperty date
$txResp = Invoke-WebRequest -Uri "$url/transactions?select=store_id,amount,type,target_date&target_date=eq.$latestDate" -Headers $headers
$txs = $txResp.Content | ConvertFrom-Json
Write-Host "Transactions na data $latestDate`: $($txs.Count)"

$inTotal = ($txs | Where-Object { $_.type -eq "in" } | ForEach-Object { [decimal]$_.amount } | Measure-Object -Sum).Sum
$outTotal = ($txs | Where-Object { $_.type -eq "out" } | ForEach-Object { [decimal][Math]::Abs($_.amount) } | Measure-Object -Sum).Sum
Write-Host "  Entradas (in): R$ $inTotal"
Write-Host "  Saidas (out):  R$ $outTotal"

# 8. Verificar datas distintas nas transactions
$txAllDatesResp = Invoke-WebRequest -Uri "$url/transactions?select=target_date&order=target_date.desc&limit=500" -Headers $headers
$txAllDates = ($txAllDatesResp.Content | ConvertFrom-Json) | Select-Object -ExpandProperty target_date | Select-Object -Unique
Write-Host ""
Write-Host "=== DATAS DISTINTAS EM TRANSACTIONS: $($txAllDates.Count) ==="
$txAllDates | ForEach-Object { Write-Host "  $_" }
