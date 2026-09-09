# spawn-agy-worker.ps1
# Spawns an agy CLI worker with structured JSON output and automatic native fallback.
# Usage: .\spawn-agy-worker.ps1 -TaskPrompt "..." -WorkerAgent "frontend-worker" [-Model "gemini-3.1-pro-high"] [-TimeoutSeconds 300]

param(
    [Parameter(Mandatory=$true)]
    [string]$TaskPrompt,

    [Parameter(Mandatory=$true)]
    [string]$WorkerAgent,

    [string]$Model = "gemini-3.1-pro-high",

    [int]$TimeoutSeconds = 300,

    [string]$AddDir = "",

    [string]$OutputSchemaPath = "",

    [switch]$Sandbox,

    [switch]$DryRun
)

# --- Locate agy CLI ---
$agyExe = $null
$agyInPath = Get-Command agy -ErrorAction SilentlyContinue
if ($agyInPath) {
    $agyExe = $agyInPath.Source
} else {
    $wingetPath = "C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages\Google.AntigravityCLI_Microsoft.Winget.Source_8wekyb3d8bbwe\agy.exe"
    if (Test-Path $wingetPath) {
        $agyExe = $wingetPath
    }
}

if (-not $agyExe) {
    $errResult = @{
        status = "FAILED"
        worker = $WorkerAgent
        execution_mode = "agy-cli"
        summary = "agy CLI not found. Fallback to native subagent required."
        fallback_triggered = $true
        errors = @("agy.exe not found in PATH or WinGet packages")
    }
    Write-Output ($errResult | ConvertTo-Json -Depth 5)
    exit 1
}

Write-Host "[spawn-agy-worker] Found agy at: $agyExe" -ForegroundColor Cyan
Write-Host "[spawn-agy-worker] Worker: $WorkerAgent | Model: $Model | Timeout: ${TimeoutSeconds}s" -ForegroundColor Cyan

# --- Build command arguments ---
$args_list = @(
    "--print", $TaskPrompt,
    "--output-format", "json",
    "--model", $Model,
    "--agent", $WorkerAgent,
    "--dangerously-skip-permissions"
)

if ($AddDir -and $AddDir -ne "") {
    $args_list += "--add-dir"
    $args_list += $AddDir
}

if ($OutputSchemaPath -and $OutputSchemaPath -ne "") {
    $args_list += "--json-schema"
    $args_list += $OutputSchemaPath
}

if ($Sandbox) {
    $args_list += "--sandbox"
}

# --- Dry Run Mode ---
if ($DryRun) {
    Write-Host "[spawn-agy-worker] DRY RUN - would execute:" -ForegroundColor Yellow
    Write-Host "  $agyExe $($args_list -join ' ')" -ForegroundColor Yellow
    $dryResult = @{
        status = "DRY_RUN"
        worker = $WorkerAgent
        execution_mode = "agy-cli"
        summary = "Dry run completed. No actual execution."
        command = "$agyExe $($args_list -join ' ')"
        fallback_triggered = $false
        errors = @()
    }
    Write-Output ($dryResult | ConvertTo-Json -Depth 5)
    exit 0
}

# --- Execute with timeout ---
Write-Host "[spawn-agy-worker] Executing agy worker..." -ForegroundColor Green
$startTime = Get-Date

try {
    $stdoutFile = "$env:TEMP\agy_stdout_$WorkerAgent.txt"
    $stderrFile = "$env:TEMP\agy_stderr_$WorkerAgent.txt"

    $process = Start-Process -FilePath $agyExe -ArgumentList $args_list `
        -NoNewWindow -PassThru -RedirectStandardOutput $stdoutFile `
        -RedirectStandardError $stderrFile

    $completed = $process.WaitForExit($TimeoutSeconds * 1000)
    $duration = ((Get-Date) - $startTime).TotalMilliseconds

    if (-not $completed) {
        $process.Kill()
        Write-Host "[spawn-agy-worker] TIMEOUT after ${TimeoutSeconds}s - killing process" -ForegroundColor Red

        $timeoutResult = @{
            status = "TIMEOUT"
            worker = $WorkerAgent
            execution_mode = "agy-cli"
            summary = "agy worker timed out after ${TimeoutSeconds}s. Fallback to native subagent required."
            duration_ms = [int]$duration
            fallback_triggered = $true
            errors = @("Process timed out after ${TimeoutSeconds} seconds")
        }
        Write-Output ($timeoutResult | ConvertTo-Json -Depth 5)
        exit 1
    }

    $stdout = ""
    $stderr = ""
    if (Test-Path $stdoutFile) { $stdout = Get-Content $stdoutFile -Raw -ErrorAction SilentlyContinue }
    if (Test-Path $stderrFile) { $stderr = Get-Content $stderrFile -Raw -ErrorAction SilentlyContinue }

    Remove-Item $stdoutFile -ErrorAction SilentlyContinue
    Remove-Item $stderrFile -ErrorAction SilentlyContinue

    if ($process.ExitCode -ne 0) {
        Write-Host "[spawn-agy-worker] agy exited with code $($process.ExitCode)" -ForegroundColor Red

        $failResult = @{
            status = "FAILED"
            worker = $WorkerAgent
            execution_mode = "agy-cli"
            summary = "agy worker failed with exit code $($process.ExitCode). Fallback to native subagent required."
            duration_ms = [int]$duration
            fallback_triggered = $true
            errors = @("Exit code: $($process.ExitCode)", $stderr)
        }
        Write-Output ($failResult | ConvertTo-Json -Depth 5)
        exit 1
    }

    try {
        $parsed = $stdout | ConvertFrom-Json
        $parsed | Add-Member -NotePropertyName "execution_mode" -NotePropertyValue "agy-cli" -Force
        $parsed | Add-Member -NotePropertyName "duration_ms" -NotePropertyValue ([int]$duration) -Force
        $parsed | Add-Member -NotePropertyName "fallback_triggered" -NotePropertyValue $false -Force

        Write-Host "[spawn-agy-worker] SUCCESS in $([int]$duration)ms" -ForegroundColor Green
        Write-Output ($parsed | ConvertTo-Json -Depth 10)
        exit 0
    }
    catch {
        Write-Host "[spawn-agy-worker] WARNING: Could not parse JSON output, wrapping raw" -ForegroundColor Yellow

        $rawResult = @{
            status = "DONE"
            worker = $WorkerAgent
            execution_mode = "agy-cli"
            summary = $stdout
            duration_ms = [int]$duration
            fallback_triggered = $false
            errors = @("Output was not valid JSON, returned raw")
        }
        Write-Output ($rawResult | ConvertTo-Json -Depth 5)
        exit 0
    }
}
catch {
    $duration = ((Get-Date) - $startTime).TotalMilliseconds
    Write-Host "[spawn-agy-worker] EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red

    $excResult = @{
        status = "FAILED"
        worker = $WorkerAgent
        execution_mode = "agy-cli"
        summary = "Exception during agy execution. Fallback to native subagent required."
        duration_ms = [int]$duration
        fallback_triggered = $true
        errors = @($_.Exception.Message)
    }
    Write-Output ($excResult | ConvertTo-Json -Depth 5)
    exit 1
}
