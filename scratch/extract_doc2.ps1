Add-Type -AssemblyName System.IO.Compression.FileSystem

$files = Get-ChildItem "C:\Users\admin\Downloads\" -Filter "*.docx"
foreach ($f in $files) {
    if ($f.Name -like "*Resumo*") {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($f.FullName)
        $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
        if ($entry) {
            $stream = $entry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            $xml = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            $text = ($xml -replace '<[^>]+>', ' ') -replace '\s+', ' '
            $text | Out-File -FilePath "C:\Users\admin\.gemini\antigravity\scratch\mec-nica-financeiro\scratch\external_agent_reference\doc2.txt" -Encoding utf8
            Write-Host "Extracted DOC2 from:" $f.Name "Length:" $text.Length
        }
        $zip.Dispose()
    }
}
