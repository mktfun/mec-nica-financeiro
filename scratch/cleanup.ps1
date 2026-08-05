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
}

Write-Host "✅ Login bem-sucedido."

# 1. Contar total de transações OFX
$ofxResponse = Invoke-RestMethod -Uri "$url/transactions?select=id,store_id,target_date,amount,occurred_at&source=eq.ofx" -Headers $headers
$ofxMap = @{}
$toDeleteOfx = @()

foreach ($tx in $ofxResponse) {
    $store = if ($null -ne $tx.store_id) { $tx.store_id } else { "null" }
    $key = "${store}_$($tx.target_date)_$($tx.occurred_at)_$($tx.amount)"
    if ($ofxMap.ContainsKey($key)) {
        $toDeleteOfx += $tx.id
    } else {
        $ofxMap[$key] = $true
    }
}

Write-Host "🧹 Encontradas $($toDeleteOfx.Count) transações OFX duplicadas."

# 2. Contar Rede duplicadas
$redeResponse = Invoke-RestMethod -Uri "$url/transactions?select=id,store_id,target_date,amount,occurred_at&source=eq.rede&fitid=is.null" -Headers $headers
$redeMap = @{}
$toDeleteRede = @()

foreach ($tx in $redeResponse) {
    $store = if ($null -ne $tx.store_id) { $tx.store_id } else { "null" }
    $key = "${store}_$($tx.target_date)_$($tx.occurred_at)_$($tx.amount)"
    if ($redeMap.ContainsKey($key)) {
        $toDeleteRede += $tx.id
    } else {
        $redeMap[$key] = $true
    }
}

Write-Host "🧹 Encontradas $($toDeleteRede.Count) transações da Rede duplicadas."

$allToDelete = $toDeleteOfx + $toDeleteRede

if ($allToDelete.Count -gt 0) {
    Write-Host "🗑️ Deletando $($allToDelete.Count) registros fantasmas..."
    
    # Deleta um por um para simplificar no script powershell
    foreach ($id in $allToDelete) {
        Invoke-RestMethod -Uri "$url/transactions?id=eq.$id" -Method Delete -Headers $headers | Out-Null
        Write-Host "." -NoNewline
    }
    Write-Host "`n✅ Limpeza concluída!"
} else {
    Write-Host "✅ Nenhuma duplicação encontrada!"
}
