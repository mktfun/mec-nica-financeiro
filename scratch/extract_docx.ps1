Add-Type -AssemblyName System.IO.Compression.FileSystem

function Extract-DocxText([string]$filePath) {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($filePath)
    $entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
    if ($entry) {
        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        $xml = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $zip.Dispose()
        return ($xml -replace '<[^>]+>', ' ') -replace '\s+', ' '
    }
    $zip.Dispose()
    return ""
}

$t1 = Extract-DocxText "C:\Users\admin\Downloads\LOCAL-AGENT-DOC-001_Arquitetura_Agente_Local.docx"
$t2 = Extract-DocxText "C:\Users\admin\Downloads\Resumo do Projeto automação.docx"

$t1 | Out-File -FilePath "C:\Users\admin\.gemini\antigravity\scratch\mec-nica-financeiro\scratch\external_agent_reference\doc1.txt" -Encoding utf8
$t2 | Out-File -FilePath "C:\Users\admin\.gemini\antigravity\scratch\mec-nica-financeiro\scratch\external_agent_reference\doc2.txt" -Encoding utf8

Write-Host "DOC1 Length:" $t1.Length
Write-Host "DOC2 Length:" $t2.Length
