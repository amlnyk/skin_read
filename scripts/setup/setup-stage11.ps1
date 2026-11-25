# Stage 11: format, run all checks, run the proofs. Nothing is installed, committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage11.ps1
# This file is ASCII only on purpose: Windows PowerShell 5.1 misreads Cyrillic in a script without BOM.
# Cyrillic words are written as \u escapes inside regular expressions.
# Not checked here (needs a real deployment and a real key): see docs/API.md and the stage 11 report.

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

# 2. Content audit: stage 11 adds no content, the counts stay as after stage 9
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 23, draft: 55, verified: 0') { $summary += 'OK   content:audit counts (23 placeholder, 55 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 23/55/0' }
if ($auditOut -match 'ERROR') { $summary += 'FAIL content:audit reports errors' } else { $summary += 'OK   content:audit has no errors' }

# 3. The audit rewrites only its own block: the sections of stages 5 to 11 must still be above it
Write-Host "`n== Proof: CONTENT_TODO.md keeps the sections of stages 5 to 11 above the generated block =="
$todo = Get-Content 'CONTENT_TODO.md' -Raw -Encoding UTF8
$start = $todo.IndexOf('<!-- content-audit:start -->')
$ok = $true
foreach ($n in 5, 6, 7, 8, 9, 10, 11) {
  $m = [regex]::Match($todo, "(?m)^## \S+ ${n}:")
  if (-not ($m.Success -and $m.Index -lt $start)) { $ok = $false }
}
if ($ok) { Write-Host 'OK' -ForegroundColor Green; $summary += 'OK   CONTENT_TODO.md keeps stage 5 to 11 sections' }
else { Write-Host 'MISSING' -ForegroundColor Red; $summary += 'FAIL CONTENT_TODO.md lost a stage section' }

# 4. No invented rules: every rule in the real compat-rules.json is a placeholder
Write-Host "`n== Proof: the real compat-rules.json has no invented rules =="
$rules = (Get-Content 'src\content\compat-rules.json' -Raw -Encoding UTF8 | ConvertFrom-Json).items
$notPlaceholder = @($rules | Where-Object { $_.reviewStatus -ne 'placeholder' })
Write-Host "rules: $($rules.Count) (not placeholder: $($notPlaceholder.Count))"
if ($notPlaceholder.Count -eq 0) { $summary += 'OK   compat-rules.json has only placeholders' } else { $summary += 'FAIL compat-rules.json has rules that are not from the materials' }

# 5. The key of the AI service lives only in api/ (and in docs and examples), never in client code
Write-Host "`n== Proof: no ANTHROPIC or VITE_ANTHROPIC in src, index.html, public or vite.config.ts =="
$clientPaths = @('src', 'public', 'index.html', 'vite.config.ts') | Where-Object { Test-Path $_ }
$clientFiles = Get-ChildItem $clientPaths -Recurse -File -ErrorAction SilentlyContinue
$leak = $clientFiles | Select-String -Pattern 'ANTHROPIC|sk-ant' -List
if (-not $leak) { Write-Host 'OK   none' -ForegroundColor Green; $summary += 'OK   no ANTHROPIC or sk-ant in client code' }
else { $leak | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL ANTHROPIC or sk-ant in client code' }

# 6. The server function imports from the client code only the shared schemas
Write-Host "`n== Proof: api/ imports only src/schemas/api =="
$apiFiles = Get-ChildItem 'api' -Recurse -Include *.ts
$badImports = $apiFiles | Select-String -Pattern "from '[^']*src/(?!schemas/api\.js)" -List
$viteName = $apiFiles | Select-String -Pattern "VITE_" -List
if (-not $badImports -and -not $viteName) { Write-Host 'OK' -ForegroundColor Green; $summary += 'OK   api/ imports only src/schemas/api and uses no VITE_ names' }
else { $badImports + $viteName | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL api/ imports client code or uses VITE_ names' }
$schemaApi = Get-Content 'src\schemas\api.ts' -Raw -Encoding UTF8
$apiImports = [regex]::Matches($schemaApi, "(?m)^import .* from '([^']+)'") | ForEach-Object { $_.Groups[1].Value }
if (@($apiImports | Where-Object { $_ -ne 'zod' }).Count -eq 0) { $summary += 'OK   src/schemas/api.ts imports only zod' } else { $summary += 'FAIL src/schemas/api.ts imports something besides zod' }

# 7. Secrets files are ignored by git
Write-Host "`n== Proof: .env files are ignored =="
$ignored = @(git check-ignore .env .env.local .env.production)
if ($ignored.Count -eq 3) { $summary += 'OK   .env, .env.local, .env.production are ignored' } else { $summary += 'FAIL a .env file is not ignored by git' }
$tracked = @(git ls-files | Where-Object { $_ -match '(^|/)\.env($|\.)' -and $_ -ne '.env.example' })
if ($tracked.Count -eq 0) { $summary += 'OK   no .env file is tracked (only .env.example)' } else { $tracked | ForEach-Object { Write-Host $_ -ForegroundColor Red }; $summary += 'FAIL a .env file is tracked by git' }

# 8. The photo texts have no "safe/forbidden", no guilt words and no percent
Write-Host "`n== Proof: no safe/forbidden words and no percent in the photo texts =="
$uk = Get-Content 'src\i18n\uk.ts' -Raw -Encoding UTF8
$from = $uk.IndexOf("`n  photo: {")
$to = $uk.IndexOf("`n  category: {", [Math]::Max($from, 0))
if ($from -lt 0 -or $to -le $from) { Write-Host 'photo/scan blocks not found' -ForegroundColor Red; $summary += 'FAIL photo/scan blocks not found in uk.ts' }
else {
  $block = $uk.Substring($from, $to - $from)
  $pattern = '\u0431\u0435\u0437\u043f\u0435\u0447\u043d|\u0437\u0430\u0431\u043e\u0440\u043e\u043d|\u0441\u0442\u0440\u0456\u043a|\u043d\u0435 \u0437\u0430\u0431\u0443\u0434\u044c|%'
  $bad = [regex]::Matches($block, $pattern, 'IgnoreCase')
  Write-Host "in uk.ts (photo and scan blocks): $($bad.Count)"
  $bad | ForEach-Object { Write-Host "  $($_.Value)" -ForegroundColor Red }
  if ($bad.Count -eq 0) { $summary += 'OK   no safe/forbidden words or percent in the photo texts' } else { $summary += 'FAIL a safe/forbidden word or a percent is in the photo texts' }
}

# 9a. The new tests: server function, label reader, image, photo store, screens
Write-Host "`n== Proof: server function, label reader, image, photos, scan, settings, products, app (tests) =="
npx vitest run api src/lib src/features/scan src/features/settings src/features/products src/app src/ui 2>&1 | Select-Object -Last 30
if ($LASTEXITCODE -eq 0) { $summary += 'OK   stage 11 tests pass' } else { $summary += 'FAIL stage 11 tests' }

# 9b. No content files changed: stage 11 adds no content
Write-Host "`n== Proof: stage 11 did not change the content files =="
$changed = @(git status --short -- 'src/content/*.json')
if ($changed.Count -eq 0) { $summary += 'OK   src/content/*.json unchanged' } else { $changed | ForEach-Object { Write-Host $_ -ForegroundColor Red }; $summary += 'FAIL src/content/*.json changed' }

# 9c. No leftovers of the working files
Write-Host "`n== Proof: no temporary files in the project =="
$tmp = @(Get-ChildItem -Force -Filter 'tsconfig.tmp*' -ErrorAction SilentlyContinue)
if ($tmp.Count -eq 0) { $summary += 'OK   no tsconfig.tmp.json' } else { $summary += 'FAIL tsconfig.tmp.json is in the project' }

# 10. The production build: no developer screen, no key, no address of the AI service
Write-Host "`n== Proof: the production build has no /dev/state, no key and no AI address =="
if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
npm run build
if ($LASTEXITCODE -ne 0) { $summary += 'FAIL npm run build' }
$dist = Get-ChildItem 'dist' -Recurse -File
$hits = $dist | Select-String -SimpleMatch -Pattern 'skinbarrier-dev-state-page', '/dev/state' -List
if (-not $hits) { $summary += 'OK   dist has no /dev/state' } else { $summary += 'FAIL dist contains /dev/state' }
$keyHits = $dist | Select-String -Pattern 'ANTHROPIC|sk-ant|api\.anthropic\.com|x-api-key' -List
if (-not $keyHits) { Write-Host 'OK   none' -ForegroundColor Green; $summary += 'OK   dist has no key, no x-api-key and no address of the AI service' }
else { $keyHits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL dist contains a key name or the address of the AI service' }

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
