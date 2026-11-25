# Stage 7: format, run all checks, run the proofs. Nothing is installed, committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage7.ps1
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

# 2. Content audit: stage 7 adds no content, the counts must not change
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 13, draft: 53, verified: 0') { $summary += 'OK   content:audit counts (13 placeholder, 53 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 13/53/0' }
if ($auditOut -match 'ERROR') { $summary += 'FAIL content:audit reports errors' } else { $summary += 'OK   content:audit has no errors' }

# 3. The audit rewrites only its own block: the sections of stages 5, 6 and 7 must still be above it
Write-Host "`n== Proof: CONTENT_TODO.md keeps the sections of stages 5, 6 and 7 above the generated block =="
$todo = Get-Content 'CONTENT_TODO.md' -Raw -Encoding UTF8
$start = $todo.IndexOf('<!-- content-audit:start -->')
$ok = $true
foreach ($n in 5, 6, 7) {
  $m = [regex]::Match($todo, "(?m)^## \S+ ${n}:")
  if (-not ($m.Success -and $m.Index -lt $start)) { $ok = $false }
}
if ($ok) { Write-Host 'OK' -ForegroundColor Green; $summary += 'OK   CONTENT_TODO.md keeps stage 5, 6 and 7 sections' }
else { Write-Host 'MISSING' -ForegroundColor Red; $summary += 'FAIL CONTENT_TODO.md lost a stage section' }

# 4. No invented rules: every rule in the real compat-rules.json is a placeholder
Write-Host "`n== Proof: the real compat-rules.json has no invented rules =="
$rules = (Get-Content 'src\content\compat-rules.json' -Raw -Encoding UTF8 | ConvertFrom-Json).items
$notPlaceholder = @($rules | Where-Object { $_.reviewStatus -ne 'placeholder' })
Write-Host "rules: $($rules.Count) (not placeholder: $($notPlaceholder.Count))"
if ($notPlaceholder.Count -eq 0) { $summary += 'OK   compat-rules.json has only placeholders' } else { $summary += 'FAIL compat-rules.json has rules that are not from the materials' }

# 5. No ingredient names hardcoded in the logic (rules and knowledge live in JSON)
Write-Host "`n== Proof: no ingredient names in logic/inci and logic/compat (tests excepted) =="
$logicFiles = Get-ChildItem 'src\logic\inci', 'src\logic\compat' -Recurse -Include *.ts | Where-Object { $_.Name -notlike '*.test.*' }
$names = $logicFiles | Select-String -Pattern 'retinol|glycolic|niacinamide|ascorbic|lactic|glycerin|salicylic|benzoyl|hyaluron' -List
if (-not $names) { Write-Host 'OK   none' -ForegroundColor Green; $summary += 'OK   no ingredient names in logic' }
else { $names | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL ingredient names in logic' }

# 6. logic stays pure
Write-Host "`n== Proof: logic/inci, logic/compat and config.ts are pure =="
$pureFiles = @($logicFiles) + @(Get-Item 'src\logic\config.ts')
$impure = $pureFiles | Select-String -Pattern "from 'react|Date\.now|Math\.random|new Date\(\)|localStorage|fetch\(" -List
if (-not $impure) { Write-Host 'OK   pure' -ForegroundColor Green; $summary += 'OK   logic is pure' }
else { $impure | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL impure code in logic' }

# 7. The words "safe" and "forbidden" never appear in the compat texts or in the compat screen code
Write-Host "`n== Proof: no safe/forbidden words in the compat texts =="
$uk = Get-Content 'src\i18n\uk.ts' -Raw -Encoding UTF8
$from = $uk.IndexOf('  compat: {')
$to = $uk.IndexOf('  category: {')
if ($from -lt 0 -or $to -le $from) { Write-Host 'compat block not found' -ForegroundColor Red; $summary += 'FAIL compat block not found in uk.ts' }
else {
  $block = $uk.Substring($from, $to - $from)
  $bad = [regex]::Matches($block, '\u0431\u0435\u0437\u043f\u0435\u0447\u043d\u043e|\u0437\u0430\u0431\u043e\u0440\u043e\u043d', 'IgnoreCase')
  $uiFiles = Get-ChildItem 'src\features\compat' -Recurse -Include *.ts, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }
  $uiBad = @()
  foreach ($f in $uiFiles) {
    $text = Get-Content $f.FullName -Raw -Encoding UTF8
    if ([regex]::IsMatch($text, '\u0431\u0435\u0437\u043f\u0435\u0447\u043d\u043e|\u0437\u0430\u0431\u043e\u0440\u043e\u043d', 'IgnoreCase')) { $uiBad += $f.Name }
  }
  Write-Host "in uk.ts compat block: $($bad.Count); in screen files: $($uiBad.Count)"
  if ($bad.Count -eq 0 -and $uiBad.Count -eq 0) { $summary += 'OK   no "safe" or "forbidden" words in the compat texts' }
  else { $summary += 'FAIL a "safe" or "forbidden" word is in the compat texts' }
}

# 8. The compat screen has no red/green marks
Write-Host "`n== Proof: the compat screen has no red/green marks =="
$cssFiles = Get-ChildItem 'src\features\compat' -Recurse -Include *.css, *.tsx | Where-Object { $_.Name -notlike '*.test.*' }
$colorHits = $cssFiles | Select-String -Pattern '\b(red|green|danger|success|warning)\b|#f00\b|#0f0\b' -List
if (-not $colorHits) { Write-Host 'OK   no red or green' -ForegroundColor Green; $summary += 'OK   compat screen has no red/green marks' }
else { $colorHits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL compat screen uses red/green' }

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
