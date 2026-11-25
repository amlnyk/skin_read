# Stage 4: format, run all checks, run the proofs. Nothing is installed, committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage4.ps1

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"
$summary = @()

# 0. Stage 3 stub that stage 4 replaces (the result screen now lives in features/profile)
Remove-Item 'src\features\test\pages\TestResultPage.tsx', 'src\features\test\pages\TestResultPage.module.css' -ErrorAction SilentlyContinue

# 1. Format everything once, then run all checks
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

# 2. Content audit: skin types, conditions and 2 urgent safety messages are draft now; 3 notes are placeholders
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 11, draft: 26, verified: 0') { $summary += 'OK   content:audit counts (11 placeholder, 26 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 11/26/0' }

# 3. The production build has no developer screen (rebuilt from scratch)
Write-Host "`n== Proof: /dev/state is absent from the production build =="
if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
npm run build
if ($LASTEXITCODE -ne 0) { $summary += 'FAIL npm run build' }
$hits = Get-ChildItem 'dist' -Recurse -File | Select-String -SimpleMatch -Pattern 'skinbarrier-dev-state-page', '/dev/state' -List
if (-not $hits) { $summary += 'OK   dist has no /dev/state' } else { $summary += 'FAIL dist contains /dev/state' }

# 4. The test screen must not know a particular question (the rules live in questionnaire.json)
Write-Host "`n== Proof: no hard-coded question ids in screen code =="
$files = Get-ChildItem 'src\features\test' -Recurse -Include *.ts, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }
$leak = $files | Select-String -Pattern 'q6_1|q9_|q10_' -List
if (-not $leak) { Write-Host 'OK   no hard-coded question ids in features/test' -ForegroundColor Green; $summary += 'OK   no hard-coded question ids in screen code' }
else { $leak | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL hard-coded question ids found in screen code' }

# 5. Sex never reaches the rules: only the two files that copy answers to the profile and back may read it
Write-Host "`n== Proof: logic/profile does not use sex except to copy it =="
$profileFiles = Get-ChildItem 'src\logic\profile' -Recurse -Include *.ts | Where-Object { $_.Name -notlike '*.test.*' -and $_.Name -notin @('extractProfile.ts', 'answersFromProfile.ts') }
$sexHits = $profileFiles | Select-String -Pattern 'sex' -CaseSensitive -List
if (-not $sexHits) { Write-Host 'OK   no references to sex outside the copy functions' -ForegroundColor Green; $summary += 'OK   logic/profile does not use sex outside the copy functions' }
else { $sexHits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL logic/profile refers to sex' }

# 6. The risky logic stays free of React and of the clock
Write-Host "`n== Proof: logic/safety and logic/profile are pure =="
$pure = Get-ChildItem 'src\logic\safety', 'src\logic\profile' -Recurse -Include *.ts | Where-Object { $_.Name -notlike '*.test.*' }
$impure = $pure | Select-String -Pattern "from 'react|Date\.now|Math\.random|new Date\(\)" -List
if (-not $impure) { Write-Host 'OK   pure' -ForegroundColor Green; $summary += 'OK   logic/safety and logic/profile are pure' }
else { $impure | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL impure code in logic' }

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
