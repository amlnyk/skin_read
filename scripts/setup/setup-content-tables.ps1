# Cosmetologist tables: import them, check everything. Nothing is committed or pushed.
#   powershell -ExecutionPolicy Bypass -File scripts\setup-content-tables.ps1
# ASCII only on purpose (Windows PowerShell 5.1).

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"
chcp 65001 | Out-Null
$summary = @()

Write-Host "`n== npm install =="
npm install
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm install' } else { $summary += 'FAIL npm install' }

# 1. The tables become the content files (and are checked on the way)
Write-Host "`n== npm run content:import =="
npm run content:import
if ($LASTEXITCODE -eq 0) { $summary += 'OK   content:import wrote the files' } else { $summary += 'FAIL content:import (see the errors above)' }
Write-Host "`n== npm run content:import -- --check =="
npm run content:import -- --check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   tables and JSON files are in sync' } else { $summary += 'FAIL tables and JSON files differ' }

# 2. The groups were copied from the file one to one: the import must not change them
git diff --quiet -- src/content/ingredient-groups.json
if ($LASTEXITCODE -eq 0) { $summary += 'OK   ingredient-groups.json unchanged by the import' } else { git diff --stat -- src/content/ingredient-groups.json; $summary += 'FAIL ingredient-groups.json changed (send the diff to Claude)' }

# 3. The audit with the new counts: 93 reference drafts in, 3 placeholders out
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 20, draft: 148, verified: 0') { $summary += 'OK   content:audit counts (20 placeholder, 148 draft, 0 verified)' } else { $summary += 'FAIL content:audit counts differ from 20/148/0' }
if ($auditOut -match 'ERROR') { $summary += 'FAIL content:audit reports errors' } else { $summary += 'OK   content:audit has no errors' }

# 4. Everything
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

Write-Host "`n== Tests: import, content, reference, compat, about =="
$testOut = (npx vitest run src/content src/features/reference src/features/compat src/features/about src/test 2>&1 | Out-String)
$testExit = $LASTEXITCODE
$testOut -split "`n" | Where-Object { $_ -match '^\s*(FAIL|Test Files|Tests )' } | Select-Object -First 40 | ForEach-Object { Write-Host $_ }
$testOut -split "`n" | Select-String -Pattern 'AssertionError|TestingLibraryElementError|Error:' -Context 0,3 | Select-Object -First 12 | ForEach-Object { Write-Host $_ }
if ($testExit -eq 0) { $summary += 'OK   tests pass' } else { $summary += 'FAIL tests' }

# 5. Content version
$ver = Get-Content 'src\content\version.json' -Raw -Encoding UTF8 | ConvertFrom-Json
if ($ver.contentVersion -eq '0.2.0') { $summary += 'OK   contentVersion 0.2.0' } else { $summary += 'FAIL contentVersion is not 0.2.0' }

# 6. The tables exist and the guide too
foreach ($f in 'content\cosmetologist\ingredients.csv', 'content\cosmetologist\compat-rules.csv', 'content\cosmetologist\groups.csv', 'docs\content-guide.md') {
  if (Test-Path $f) { $summary += "OK   $f" } else { $summary += "FAIL $f is missing" }
}

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
