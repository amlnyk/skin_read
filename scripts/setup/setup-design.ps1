# Temporary iOS-like design: format, check everything, build. Nothing is committed or pushed.
#   powershell -ExecutionPolicy Bypass -File scripts\setup-design.ps1
# ASCII only on purpose (Windows PowerShell 5.1).

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"
$summary = @()

Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null

Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

Write-Host "`n== Tests: tokens (contrast, sizes), layout, ui, reference, routine =="
$testOut = (npx vitest run src/styles src/app src/ui src/features/reference src/features/routine 2>&1 | Out-String)
$testExit = $LASTEXITCODE
$testOut -split "`n" | Where-Object { $_ -match '^\s*(FAIL|Test Files|Tests )' } | Select-Object -First 30 | ForEach-Object { Write-Host $_ }
$testOut -split "`n" | Select-String -Pattern 'AssertionError|TestingLibraryElementError|Error:' -Context 0,3 | Select-Object -First 12 | ForEach-Object { Write-Host $_ }
if ($testExit -eq 0) { $summary += 'OK   design tests pass' } else { $summary += 'FAIL design tests' }

# Raw colours only in tokens.css (and the documented exceptions)
$colorHits = @(Get-ChildItem 'src' -Recurse -File -Include *.css, *.ts, *.tsx | Where-Object { $_.Name -ne 'tokens.css' -and $_.Name -notmatch '\.test\.tsx?$' -and $_.Name -ne 'browserImage.ts' } | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(')
$colorHits | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber): $($_.Line.Trim())" -ForegroundColor Red }
if ($colorHits.Count -eq 0) { $summary += 'OK   all colours come from tokens.css' } else { $summary += 'FAIL a raw colour outside tokens.css' }

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
Write-Host "`nTo look at it: npm run dev, open the address in the browser, F12, phone view (iPhone 12/13/14)." -ForegroundColor Yellow
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output (and screenshots if something looks off) to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
