# Stage 9: format, run all checks, run the proofs. Nothing is installed, committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage9.ps1
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

# 2. Content audit: stage 9 adds 12 observation templates (2 draft from the spec, 10 placeholder)
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 23, draft: 55, verified: 0') { $summary += 'OK   content:audit counts (23 placeholder, 55 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 23/55/0' }
if ($auditOut -match 'ERROR') { $summary += 'FAIL content:audit reports errors' } else { $summary += 'OK   content:audit has no errors' }

# 3. The audit rewrites only its own block: the sections of stages 5, 6, 7 and 8 must still be above it
Write-Host "`n== Proof: CONTENT_TODO.md keeps the sections of stages 5, 6, 7, 8 and 9 above the generated block =="
$todo = Get-Content 'CONTENT_TODO.md' -Raw -Encoding UTF8
$start = $todo.IndexOf('<!-- content-audit:start -->')
$ok = $true
foreach ($n in 5, 6, 7, 8, 9) {
  $m = [regex]::Match($todo, "(?m)^## \S+ ${n}:")
  if (-not ($m.Success -and $m.Index -lt $start)) { $ok = $false }
}
if ($ok) { Write-Host 'OK' -ForegroundColor Green; $summary += 'OK   CONTENT_TODO.md keeps stage 5, 6, 7, 8 and 9 sections' }
else { Write-Host 'MISSING' -ForegroundColor Red; $summary += 'FAIL CONTENT_TODO.md lost a stage section' }

# 4. No invented rules: every rule in the real compat-rules.json is a placeholder
Write-Host "`n== Proof: the real compat-rules.json has no invented rules =="
$rules = (Get-Content 'src\content\compat-rules.json' -Raw -Encoding UTF8 | ConvertFrom-Json).items
$notPlaceholder = @($rules | Where-Object { $_.reviewStatus -ne 'placeholder' })
Write-Host "rules: $($rules.Count) (not placeholder: $($notPlaceholder.Count))"
if ($notPlaceholder.Count -eq 0) { $summary += 'OK   compat-rules.json has only placeholders' } else { $summary += 'FAIL compat-rules.json has rules that are not from the materials' }

# 5. No ingredient names hardcoded in logic/routine and logic/analyze (the knowledge lives in JSON)
Write-Host "`n== Proof: no ingredient names in logic/routine and logic/analyze (tests excepted) =="
$logicFiles = Get-ChildItem 'src\logic\analyze', 'src\logic\routine' -Recurse -Include *.ts | Where-Object { $_.Name -notlike '*.test.*' }
$names = $logicFiles | Select-String -Pattern 'retinol\b|glycolic|niacinamide|ascorbic|lactic|glycerin|salicylic|benzoyl|hyaluron' -List
if (-not $names) { Write-Host 'OK   none' -ForegroundColor Green; $summary += 'OK   no ingredient names in logic/routine and logic/analyze' }
else { $names | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL ingredient names in logic/routine and logic/analyze' }

# 6. logic stays pure
Write-Host "`n== Proof: logic/routine and logic/analyze are pure =="
$pureFiles = @($logicFiles)
$impure = $pureFiles | Select-String -Pattern "from 'react|Date\.now|Math\.random|new Date\(\)|localStorage|fetch\(|window\.|document\." -List
if (-not $impure) { Write-Host 'OK   pure' -ForegroundColor Green; $summary += 'OK   logic is pure' }
else { $impure | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL impure code in logic' }

# 7. No "safe", "forbidden", "grade" or percent in the texts of stage 9 (the routine has no score)
Write-Host "`n== Proof: no safe/forbidden/grade words and no percent in the texts of stage 9 =="
$uk = Get-Content 'src\i18n\uk.ts' -Raw -Encoding UTF8
$from = $uk.IndexOf('  analysis: {')
$to = $uk.IndexOf('  reference: {')
if ($from -lt 0 -or $to -le $from) { Write-Host 'analysis block not found' -ForegroundColor Red; $summary += 'FAIL analysis block not found in uk.ts' }
else {
  $block = $uk.Substring($from, $to - $from)
  $pattern = '\u0431\u0435\u0437\u043f\u0435\u0447\u043d|\u0437\u0430\u0431\u043e\u0440\u043e\u043d|\u043e\u0446\u0456\u043d\u043a|(^|\s)\u0431\u0430\u043b(\u0438|\u0456\u0432|\u043e\u043c)?(\s|[.,]|$)|%'
  $bad = [regex]::Matches($block, $pattern, 'IgnoreCase')
  $files = @(Get-ChildItem 'src\features\routine' -Recurse -Include *.ts, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }) + @(Get-Item 'src\content\observation-templates.json')
  $fileBad = @()
  foreach ($f in $files) {
    $text = Get-Content $f.FullName -Raw -Encoding UTF8
    if ([regex]::IsMatch($text, $pattern, 'IgnoreCase')) { $fileBad += $f.Name }
  }
  Write-Host "in uk.ts (analysis block): $($bad.Count); in screen files and templates: $($fileBad.Count)"
  $fileBad | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  if ($bad.Count -eq 0 -and $fileBad.Count -eq 0) { $summary += 'OK   no safe/forbidden/grade words in the stage 9 texts' }
  else { $summary += 'FAIL a safe/forbidden/grade word or a percent is in the stage 9 texts' }
}

# 8. The new screen has no red/green marks
Write-Host "`n== Proof: the analysis screen has no red/green marks =="
$cssFiles = Get-ChildItem 'src\features\routine' -Recurse -Include *.css, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }
$colorHits = $cssFiles | Select-String -Pattern ':\s*(red|green)\b|--color-(red|green|danger|success|warning)|#f00\b|#0f0\b|#00ff00|#ff0000' -List
if (-not $colorHits) { Write-Host 'OK   no red or green' -ForegroundColor Green; $summary += 'OK   analysis screen has no red/green marks' }
else { $colorHits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL analysis screen uses red/green' }

# 8b. The analysis of the routine: persona T7, empty routine, mixed routine (logic tests) and the content
Write-Host "`n== Proof: T7, empty and mixed routine, observation templates (tests) =="
npx vitest run src/logic/routine src/content 2>&1 | Select-Object -Last 14
if ($LASTEXITCODE -eq 0) { $summary += 'OK   routine analysis and content tests pass' } else { $summary += 'FAIL routine analysis or content tests' }

# 8c. Only the new content file is added: the other content files are the same as in git
Write-Host "`n== Proof: stage 9 only added observation-templates.json to the content files =="
$changed = @(git status --short -- 'src/content/*.json' | Where-Object { $_ -notmatch 'observation-templates\.json' })
if ($changed.Count -eq 0) { $summary += 'OK   only observation-templates.json is new in src/content' } else { $changed | ForEach-Object { Write-Host $_ -ForegroundColor Red }; $summary += 'FAIL other src/content/*.json changed' }

# 9. The production build has no developer screen (rebuilt from scratch)
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
