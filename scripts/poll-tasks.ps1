# poll-tasks.ps1 — Poll dev API for tasks on test + prod
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\poll-tasks.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\poll-tasks.ps1 -Continuous
#   powershell -ExecutionPolicy Bypass -File scripts\poll-tasks.ps1 -Continuous -Interval 60

param(
    [switch]$Continuous,
    [int]$Interval = 120
)

$DEV_API_KEY = "gE9Jupab3NW/H6/2QxkwMsD5lq7pRFWk+2lLGuAX3FQ="
$ENVS = @(
    @{ Name = "PROD"; Base = "https://ailaopo.online" },
    @{ Name = "TEST"; Base = "https://test.ailaopo.online" }
)

$taskStateFile = "$PSScriptRoot\..\.task-state.json"

function Invoke-DevAPI {
    param($Url)
    try {
        $tmp = [System.IO.Path]::GetTempFileName()
        curl.exe -k -s -o "$tmp" $Url -H "Authorization: Bearer $DEV_API_KEY" 2>$null
        $content = Get-Content -Path $tmp -Raw -Encoding UTF8
        Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
        if ([string]::IsNullOrWhiteSpace($content)) { return $null }
        return $content | ConvertFrom-Json
    } catch { return $null }
}

function Get-Count {
    param($Item)
    if ($null -eq $Item) { return 0 }
    if ($Item -is [array]) { return $Item.Count }
    return 1
}

function Check-Environment {
    param($Env)
    Write-Host "`n=== $($Env.Name) ($($Env.Base)) ===" -ForegroundColor Cyan

    $pending  = Invoke-DevAPI "$($Env.Base)/api/dev/pending"
    $rejected = Invoke-DevAPI "$($Env.Base)/api/dev/rejected"
    $all      = Invoke-DevAPI "$($Env.Base)/api/dev/agents"

    $pendingCount  = if ($pending -and $pending.PSObject.Properties.Name -contains 'pending') { $pending.pending } else { 0 }
    $rejectedCount = if ($rejected -and $rejected.agents) { (Get-Count $rejected.agents) } else { 0 }

    if ($all -and $all.agents) {
        $agents = @($all.agents)  # force array
        $inDev    = $agents | Where-Object { $_.status -eq "in_development" }
        $inReview = $agents | Where-Object { $_.status -eq "dev_review" }
        $rej      = $agents | Where-Object { $_.status -eq "rejected" }

        $inDevList = @($inDev)
        $inReviewList = @($inReview)
        $rejList = @($rej)

        if ($inDevList.Count -gt 0) {
            Write-Host "  >>> AI NEEDS TO WORK (in_development): $($inDevList.Count)" -ForegroundColor Green
            foreach ($a in $inDevList) {
                Write-Host "     - $($a.name)" -ForegroundColor Green
                Write-Host "       description: $($a.description)" -ForegroundColor DarkGray
                if ($a.review_notes) { Write-Host "       notes: $($a.review_notes)" -ForegroundColor DarkGray }
                if ($a.review_comments) { Write-Host "       rework: $($a.review_comments)" -ForegroundColor Yellow }
            }
        }
        if ($inReviewList.Count -gt 0) {
            Write-Host "  [waiting admin] dev_review: $($inReviewList.Count)" -ForegroundColor Yellow
            foreach ($a in $inReviewList) {
                Write-Host "     - $($a.name)" -ForegroundColor Yellow
            }
        }
        if ($rejList.Count -gt 0) {
            Write-Host "  >>> AI NEEDS TO REWORK (rejected): $($rejList.Count)" -ForegroundColor Magenta
            foreach ($a in $rejList) {
                Write-Host "     - $($a.name) | $($a.rejection_reason)" -ForegroundColor Magenta
            }
        }
        $completed = $agents | Where-Object { $_.status -eq "completed" }
        Write-Host "  [done] completed: $(@($completed).Count)" -ForegroundColor DarkGray
    } else {
        Write-Host "  (no agents)" -ForegroundColor DarkGray
    }

    $needAI = 0
    if ($all -and $all.agents) {
        $agents = @($all.agents)
        $needAI = (@($agents | Where-Object { $_.status -eq "in_development" })).Count
        $needAI += (@($agents | Where-Object { $_.status -eq "rejected" })).Count
    }

    return @{
        env = $Env.Name
        pending = $pendingCount
        rejected = $rejectedCount
        needAI = $needAI
        timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }
}

function Save-State {
    param($Results)
    $state = @{ lastChecked = (Get-Date -Format "o"); results = $Results }
    $state | ConvertTo-Json -Depth 3 | Set-Content -Path $taskStateFile
}

# --- Main ---
Write-Host "=== Pier Task Poller ===" -ForegroundColor Cyan
Write-Host "Checking $(if ($Continuous) { "every ${Interval}s (Ctrl+C to stop)" } else { "once" })" -ForegroundColor DarkGray
Write-Host "State file: $taskStateFile" -ForegroundColor DarkGray

do {
    $allResults = @()
    $totalNeedAI = 0
    foreach ($env in $ENVS) {
        $r = Check-Environment $env
        $allResults += $r
        $totalNeedAI += $r.needAI
    }
    Save-State $allResults

    if ($totalNeedAI -gt 0) {
        Write-Host "`n!!! $totalNeedAI task(s) need AI attention !!!" -ForegroundColor Magenta
        Write-Host "Tell the AI to load auto-task-worker skill and process them." -ForegroundColor Yellow
    } else {
        Write-Host "`nNo tasks need AI work right now." -ForegroundColor DarkGray
    }

    if (-not $Continuous) { break }

    Write-Host "`n--- Next check in ${Interval}s ---" -ForegroundColor DarkGray
    Start-Sleep -Seconds $Interval
} while ($Continuous)
