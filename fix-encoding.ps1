$files = Get-ChildItem src -Recurse -File -Include *.ts,*.tsx
foreach ($f in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    $original = $text
    $text = $text -replace 'Ã§', 'ç'
    $text = $text -replace 'Ã£', 'ã'
    $text = $text -replace 'Ã¡', 'á'
    $text = $text -replace 'Ã©', 'é'
    $text = $text -replace 'Ã³', 'ó'
    $text = $text -replace 'Ã­', 'í'
    $text = $text -replace 'Ãº', 'ú'
    $text = $text -replace 'Ã¢', 'â'
    $text = $text -replace 'Ãª', 'ê'
    $text = $text -replace 'Ã´', 'ô'
    $text = $text -replace 'Ãµ', 'õ'
    $text = $text -replace 'Ã‡', 'Ç'
    $text = $text -replace 'Ã', 'Á'
    $text = $text -replace 'Ã‰', 'É'
    $text = $text -replace 'Ã“', 'Ó'
    $text = $text -replace 'Ãš', 'Ú'
    
    if ($text -cne $original) {
        [System.IO.File]::WriteAllText($f.FullName, $text, [System.Text.Encoding]::UTF8)
        Write-Host "Fixed: $($f.Name)"
    }
}
