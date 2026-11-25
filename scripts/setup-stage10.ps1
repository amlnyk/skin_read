# Stage 10: format, run all checks, run the proofs. Nothing is installed, committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage10.ps1
# This file is ASCII only on purpose: Windows PowerShell 5.1 misreads Cyrillic in a script without BOM.
# Cyrillic words are written as \u escapes inside regular expressions.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host "Project folder: $(Get-Location)"
$summary = @()

# 1. Format everything once, then run all checks
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

# 2. Content audit: stage 10 adds no content, the counts stay as after stage 9
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 23, draft: 55, verified: 0') { $summary += 'OK   content:audit counts (23 placeholder, 55 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 23/55/0' }
if ($auditOut -match 'ERROR') { $summary += 'FAIL content:audit reports errors' } else { $summary += 'OK   content:audit has no errors' }

# 3. The audit rewrites only its own block: the sections of stages 5 to 9 must still be above it
Write-Host "`n== Proof: CONTENT_TODO.md keeps the sections of stages 5 to 10 above the generated block =="
$todo = Get-Content 'CONTENT_TODO.md' -Raw -Encoding UTF8
$start = $todo.IndexOf('<!-- content-audit:start -->')
$ok = $true
foreach ($n in 5, 6, 7, 8, 9, 10) {
  $m = [regex]::Match($todo, "(?m)^## \S+ ${n}:")
  if (-not ($m.Success -and $m.Index -lt $start)) { $ok = $false }
}
if ($ok) { Write-Host 'OK' -ForegroundColor Green; $summary += 'OK   CONTENT_TODO.md keeps stage 5 to 10 sections' }
else { Write-Host 'MISSING' -ForegroundColor Red; $summary += 'FAIL CONTENT_TODO.md lost a stage section' }

# 4. No invented rules: every rule in the real compat-rules.json is a placeholder
Write-Host "`n== Proof: the real compat-rules.json has no invented rules =="
$rules = (Get-Content 'src\content\compat-rules.json' -Raw -Encoding UTF8 | ConvertFrom-Json).items
$notPlaceholder = @($rules | Where-Object { $_.reviewStatus -ne 'placeholder' })
Write-Host "rules: $($rules.Count) (not placeholder: $($notPlaceholder.Count))"
if ($notPlaceholder.Count -eq 0) { $summary += 'OK   compat-rules.json has only placeholders' } else { $summary += 'FAIL compat-rules.json has rules that are not from the materials' }

# 5. logic/journal and lib/exportImport stay pure (no clock, no random, no DOM, no network)
Write-Host "`n== Proof: logic/journal and lib/exportImport are pure =="
$pureFiles = Get-ChildItem 'src\logic\journal', 'src\lib\exportImport' -Recurse -Include *.ts | Where-Object { $_.Name -notlike '*.test.*' }
$impure = $pureFiles | Select-String -Pattern "from 'react|Date\.now|Math\.random|new Date\(\)|localStorage|fetch\(|window\.|document\." -List
if (-not $impure) { Write-Host 'OK   pure' -ForegroundColor Green; $summary += 'OK   logic/journal and lib/exportImport are pure' }
else { $impure | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL impure code in logic/journal or lib/exportImport' }

# 6. Nothing from a file or a note is ever run or put in as HTML
Write-Host "`n== Proof: no innerHTML, dangerouslySetInnerHTML, eval or new Function in src (tests excepted) =="
$srcFiles = Get-ChildItem 'src' -Recurse -Include *.ts, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }
$danger = $srcFiles | Select-String -Pattern 'dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function\(' -List
if (-not $danger) { Write-Host 'OK   none' -ForegroundColor Green; $summary += 'OK   no innerHTML, eval or new Function in src' }
else { $danger | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL innerHTML, eval or new Function in src' }

# 7. The import limits are in one place and have the agreed values
Write-Host "`n== Proof: the import accepts only .json up to 5 MB =="
$imp = Get-Content 'src\lib\exportImport\importFile.ts' -Raw -Encoding UTF8
$limitOk = ($imp -match 'IMPORT_MAX_BYTES\s*=\s*5\s*\*\s*1024\s*\*\s*1024') -and ($imp -match '\.json')
if ($limitOk) { $summary += 'OK   import limit is 5 MB and .json only' } else { $summary += 'FAIL import limit or type check changed' }

# 8. No guilt, no streaks, no "safe/forbidden" and no percent in the texts of stage 10
Write-Host "`n== Proof: no guilt words, no safe/forbidden words, no percent in the journal and settings texts =="
$uk = Get-Content 'src\i18n\uk.ts' -Raw -Encoding UTF8
$from = $uk.IndexOf('  journal: {')
$to = $uk.IndexOf('  reference: {')
if ($from -lt 0 -or $to -le $from) { Write-Host 'journal/settings blocks not found' -ForegroundColor Red; $summary += 'FAIL journal/settings blocks not found in uk.ts' }
else {
  $block = $uk.Substring($from, $to - $from)
  $pattern = '\u0431\u0435\u0437\u043f\u0435\u0447\u043d|\u0437\u0430\u0431\u043e\u0440\u043e\u043d|\u0441\u0442\u0440\u0456\u043a|\u043d\u0435 \u0437\u0430\u0431\u0443\u0434\u044c|\u0442\u0438 \u0437\u0430\u0431\u0443\u043b\u0430|\u0432\u0442\u0440\u0430\u0447\u0435\u043d|%'
  $bad = [regex]::Matches($block, $pattern, 'IgnoreCase')
  Write-Host "in uk.ts (journal and settings blocks): $($bad.Count)"
  $bad | ForEach-Object { Write-Host "  $($_.Value)" -ForegroundColor Red }
  if ($bad.Count -eq 0) { $summary += 'OK   no guilt/safe/forbidden words in the stage 10 texts' }
  else { $summary += 'FAIL a guilt/safe/forbidden word or a percent is in the stage 10 texts' }
}

# 9a. The new tests: journal logic, export/import, data categories, store, screens
Write-Host "`n== Proof: journal logic, export/import, settings and journal screens, store (tests) =="
npx vitest run src/logic/journal src/lib/exportImport src/features/settings src/features/journal src/store src/app 2>&1 | Select-Object -Last 30
if ($LASTEXITCODE -eq 0) { $summary += 'OK   stage 10 tests pass' } else { $summary += 'FAIL stage 10 tests' }

# 9b. No content files changed: stage 10 adds no content
Write-Host "`n== Proof: stage 10 did not change the content files =="
$changed = @(git status --short -- 'src/content/*.json')
if ($changed.Count -eq 0) { $summary += 'OK   src/content/*.json unchanged' } else { $changed | ForEach-Object { Write-Host $_ -ForegroundColor Red }; $summary += 'FAIL src/content/*.json changed' }

# 9c. No leftovers of the working files
Write-Host "`n== Proof: no temporary files in the project =="
$tmp = @(Get-ChildItem -Force -Filter 'tsconfig.tmp*' -ErrorAction SilentlyContinue)
if ($tmp.Count -eq 0) { $summary += 'OK   no tsconfig.tmp.json' } else { $summary += 'FAIL tsconfig.tmp.json is in the project' }

# 10. The production build has no developer screen (rebuilt from scratch)
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
