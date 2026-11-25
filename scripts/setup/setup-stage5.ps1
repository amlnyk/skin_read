# Stage 5: remove the old stubs, format, run all checks, run the proofs. Nothing is installed, committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage5.ps1

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"
$summary = @()

# 0. Files that stage 5 replaces: the care stub (now features/routine) and the doctor banner (now in ui)
Remove-Item 'src\features\care' -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item 'src\features\profile\components\DoctorBanner.tsx', 'src\features\profile\components\DoctorBanner.module.css' -ErrorAction SilentlyContinue

# 1. Format everything once, then run all checks
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

# 2. Content audit: 3 new placeholders (the base routine steps)
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 14, draft: 26, verified: 0') { $summary += 'OK   content:audit counts (14 placeholder, 26 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 14/26/0' }

# 3. The production build has no developer screen (rebuilt from scratch)
Write-Host "`n== Proof: /dev/state is absent from the production build =="
if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
npm run build
if ($LASTEXITCODE -ne 0) { $summary += 'FAIL npm run build' }
$hits = Get-ChildItem 'dist' -Recurse -File | Select-String -SimpleMatch -Pattern 'skinbarrier-dev-state-page', '/dev/state' -List
if (-not $hits) { $summary += 'OK   dist has no /dev/state' } else { $summary += 'FAIL dist contains /dev/state' }

# 4. The routine never depends on sex (no separate routines "for her" and "for him")
Write-Host "`n== Proof: the routine code does not use sex =="
$routineFiles = Get-ChildItem 'src\logic\routine', 'src\features\routine' -Recurse -Include *.ts, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }
$sexHits = $routineFiles | Select-String -Pattern 'sex' -CaseSensitive -List
if (-not $sexHits) { Write-Host 'OK   no references to sex in the routine code' -ForegroundColor Green; $summary += 'OK   routine code does not use sex' }
else { $sexHits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL routine code refers to sex' }

# 5. The routine logic stays free of React and of the clock
Write-Host "`n== Proof: logic/routine and logic/profile are pure =="
$pure = Get-ChildItem 'src\logic\routine', 'src\logic\profile', 'src\logic\safety' -Recurse -Include *.ts | Where-Object { $_.Name -notlike '*.test.*' }
$impure = $pure | Select-String -Pattern "from 'react|Date\.now|Math\.random|new Date\(\)" -List
if (-not $impure) { Write-Host 'OK   pure' -ForegroundColor Green; $summary += 'OK   logic/routine, logic/profile and logic/safety are pure' }
else { $impure | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL impure code in logic' }

# 6. The old stubs are gone
Write-Host "`n== Proof: the old care stub and the old banner are gone =="
$gone = (-not (Test-Path 'src\features\care')) -and (-not (Test-Path 'src\features\profile\components\DoctorBanner.tsx'))
if ($gone) { $summary += 'OK   old stubs removed' } else { $summary += 'FAIL old stubs still exist' }

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
