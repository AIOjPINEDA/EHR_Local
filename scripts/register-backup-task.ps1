<#
.SYNOPSIS
Registra la tarea programada diaria de backup de ConsultaMed.

.DESCRIPTION
Usa el modulo ScheduledTasks en lugar de schtasks.exe para poder activar
StartWhenAvailable, que recupera la ejecucion si el equipo estaba apagado o
suspendido a la hora prevista. Toda la salida del backup se redirige a
logs\backup.log, de modo que un fallo deja rastro en disco en vez de
desaparecer silenciosamente.
#>
param(
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [Parameter(Mandatory = $true)][string]$TaskName,
    [string]$At = "22:00"
)

$ErrorActionPreference = "Stop"

try {
    $logDir = Join-Path $RepoRoot "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    $logFile = Join-Path $logDir "backup.log"
    $repoTool = Join-Path $RepoRoot "scripts\repo-tool.mjs"

    if (-not (Test-Path $repoTool)) {
        Write-Error "No se encontro $repoTool"
        exit 1
    }

    # cmd /c ... >> log 2>&1 deja constancia de cada ejecucion, con marca de tiempo.
    $inner = 'echo. >> "{0}" & echo [%DATE% %TIME%] backup start >> "{0}" & node "{1}" backup >> "{0}" 2>&1 & echo [%DATE% %TIME%] backup exit=%ERRORLEVEL% >> "{0}"' -f $logFile, $repoTool

    $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument ('/c ' + $inner) -WorkingDirectory $RepoRoot
    $trigger = New-ScheduledTaskTrigger -Daily -At $At

    $settings = New-ScheduledTaskSettingsSet `
        -StartWhenAvailable `
        -DontStopIfGoingOnBatteries `
        -AllowStartIfOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
        -MultipleInstances IgnoreNew

    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
        -Settings $settings -Principal $principal -Force -ErrorAction Stop | Out-Null

    $info = Get-ScheduledTaskInfo -TaskName $TaskName
    Write-Output "Tarea '$TaskName' registrada. Proxima ejecucion: $($info.NextRunTime)"
    Write-Output "Log: $logFile"
    exit 0
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
