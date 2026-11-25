# Stage 6: format, run all checks, run the proofs. Nothing is installed, committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage6.ps1

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"
$summary = @()

# 1. Format everything once, then run all checks
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

# 2. Content audit: 27 groups became draft, 2 group stubs went away, comedogenic_oils is a placeholder
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 13, draft: 53, verified: 0') { $summary += 'OK   content:audit counts (13 placeholder, 53 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 13/53/0' }
if ($auditOut -match 'ERROR') { $summary += 'FAIL content:audit reports errors' } else { $summary += 'OK   content:audit has no errors' }

# 3. The audit rewrites only its own block: the sections of stages 5 and 6 must still be there (they were lost once)
Write-Host "`n== Proof: CONTENT_TODO.md keeps the sections of stages 5 and 6 above the generated block =="
$todo = Get-Content 'CONTENT_TODO.md' -Raw -Encoding UTF8
$start = $todo.IndexOf('<!-- content-audit:start -->')
$m5 = [regex]::Match($todo, '(?m)^## \S+ 5:')
$m6 = [regex]::Match($todo, '(?m)^## \S+ 6:')
if ($m5.Success -and $m6.Success -and $m5.Index -lt $start -and $m6.Index -lt $start) { Write-Host 'OK' -ForegroundColor Green; $summary += 'OK   CONTENT_TODO.md keeps stage 5 and 6 sections' }
else { Write-Host 'MISSING' -ForegroundColor Red; $summary += 'FAIL CONTENT_TODO.md lost a stage section' }

# 4. No invented ingredients: every ingredient record is a stub; every group has a source
Write-Host "`n== Proof: no invented ingredients, every group has a source =="
$ingredients = (Get-Content 'src\content\ingredients.json' -Raw -Encoding UTF8 | ConvertFrom-Json).items
$groups = (Get-Content 'src\content\ingredient-groups.json' -Raw -Encoding UTF8 | ConvertFrom-Json).items
$real = @($ingredients | Where-Object { $_.reviewStatus -ne 'placeholder' })
$noSource = @($groups | Where-Object { -not $_.source })
$withText = @($groups | Where-Object { $null -ne $_.description })
Write-Host "ingredients: $($ingredients.Count) (not placeholder: $($real.Count)); groups: $($groups.Count) (without source: $($noSource.Count), with description: $($withText.Count))"
if ($real.Count -eq 0 -and $noSource.Count -eq 0 -and $withText.Count -eq 0) { $summary += 'OK   no invented ingredients or descriptions; every group has a source' }
else { $summary += 'FAIL there are ingredient records or group descriptions that are not from the materials' }

# 5. The reference has no red/green marks
Write-Host "`n== Proof: the reference does not mark components good or bad =="
$refFiles = Get-ChildItem 'src\features\reference' -Recurse -Include *.css, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }
$colorHits = $refFiles | Select-String -Pattern '\b(red|green|danger|success|warning)\b|#f00\b|#0f0\b' -List
if (-not $colorHits) { Write-Host 'OK   no red or green' -ForegroundColor Green; $summary += 'OK   reference has no red/green marks' }
else { $colorHits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL reference uses red/green' }

# 6. logic/inci stays pure
Write-Host "`n== Proof: logic/inci is pure =="
$pure = Get-ChildItem 'src\logic\inci' -Recurse -Include *.ts | Where-Object { $_.Name -notlike '*.test.*' }
$impure = $pure | Select-String -Pattern "from 'react|Date\.now|Math\.random|new Date\(\)" -List
if (-not $impure) { Write-Host 'OK   pure' -ForegroundColor Green; $summary += 'OK   logic/inci is pure' }
else { $impure | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL impure code in logic/inci' }

# 7. The production build has no developer screen (rebuilt from scratch)
Write-Host "`n== Proof: /dev/state is absent from the production build =="
if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
npm run build
if ($LASTEXITCODE -ne 0) { $summary += 'FAIL npm run build' }
$hits = Get-ChildItem 'dist' -Recurse -File | Select-String -SimpleMatch -Pattern 'skinbarrier-dev-state-page', '/dev/state' -List
if (-not $hits) { $summary += 'OK   dist has no /dev/state' } else { $summary += 'FAIL dist contains /dev/state' }

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
