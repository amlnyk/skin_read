# Stage 13: install, format, run all checks, run the proofs. Nothing is committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage13.ps1
# This file is ASCII only on purpose: Windows PowerShell 5.1 misreads Cyrillic in a script without BOM.
# Cyrillic words are written as \u escapes inside regular expressions.
# Not checked here (needs a browser, a phone or a deployment): Lighthouse, installing on Android and iOS,
# offline mode on a real phone, curl -I against a deployed address, the bottom navigation at 360px.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host "Project folder: $(Get-Location)"
$summary = @()

# 0. Stage 13 adds one dev dependency (vite-plugin-pwa): install it first
Write-Host "`n== npm install =="
npm install
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm install' } else { $summary += 'FAIL npm install' }
$pwaVersion = (npm ls vite-plugin-pwa --depth=0 2>&1 | Out-String)
Write-Host $pwaVersion
if ($pwaVersion -match 'vite-plugin-pwa@') { $summary += 'OK   vite-plugin-pwa is installed' } else { $summary += 'FAIL vite-plugin-pwa is not installed' }

# 1. Format everything once, then run all checks
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

# 2. Content audit: stage 13 adds no content, the counts stay as after stage 9
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 23, draft: 55, verified: 0') { $summary += 'OK   content:audit counts (23 placeholder, 55 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 23/55/0' }
if ($auditOut -match 'ERROR') { $summary += 'FAIL content:audit reports errors' } else { $summary += 'OK   content:audit has no errors' }

# 3. The audit rewrites only its own block: the sections of stages 5 to 13 must still be above it
Write-Host "`n== Proof: CONTENT_TODO.md keeps the sections of stages 5 to 13 above the generated block =="
$todo = Get-Content 'CONTENT_TODO.md' -Raw -Encoding UTF8
$start = $todo.IndexOf('<!-- content-audit:start -->')
$ok = $true
foreach ($n in 5, 6, 7, 8, 9, 10, 11, 12, 13) {
  $m = [regex]::Match($todo, "(?m)^## \S+ ${n}:")
  if (-not ($m.Success -and $m.Index -lt $start)) { $ok = $false }
}
if ($ok) { Write-Host 'OK' -ForegroundColor Green; $summary += 'OK   CONTENT_TODO.md keeps stage 5 to 13 sections' }
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
# Text files only: the png icons carry embedded provenance metadata that mentions the tool vendor by name.
$binaryExt = '.png', '.jpg', '.jpeg', '.ico', '.gif', '.webp', '.woff', '.woff2'
$clientFiles = Get-ChildItem $clientPaths -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $binaryExt -notcontains $_.Extension.ToLower() }
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

# 7. Secrets files are ignored by git
Write-Host "`n== Proof: .env files are ignored =="
$ignored = @(git check-ignore .env .env.local .env.production)
if ($ignored.Count -eq 3) { $summary += 'OK   .env, .env.local, .env.production are ignored' } else { $summary += 'FAIL a .env file is not ignored by git' }
$tracked = @(git ls-files | Where-Object { $_ -match '(^|/)\.env($|\.)' -and $_ -ne '.env.example' })
if ($tracked.Count -eq 0) { $summary += 'OK   no .env file is tracked (only .env.example)' } else { $tracked | ForEach-Object { Write-Host $_ -ForegroundColor Red }; $summary += 'FAIL a .env file is tracked by git' }

# 8. Tokens: nothing bypasses tokens.css. The places that are allowed to are listed here.
Write-Host "`n== Tokens: raw colors and font sizes outside tokens.css =="
$srcFiles = Get-ChildItem 'src' -Recurse -File -Include *.css, *.ts, *.tsx | Where-Object { $_.Name -ne 'tokens.css' -and $_.Name -notmatch '\.test\.tsx?$' }
$colorHits = @($srcFiles | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(')
$colorHits | ForEach-Object { Write-Host "  color: $($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
$unexpected = @($colorHits | Where-Object { $_.Path -notmatch 'browserImage\.ts$' })
if ($unexpected.Count -eq 0) { $summary += 'OK   the only raw color outside tokens.css is the canvas background in browserImage.ts' } else { $summary += 'FAIL raw colors outside tokens.css (see above)' }
$sizeHits = @(Get-ChildItem 'src' -Recurse -File -Include *.css | Select-String -Pattern 'font-size:' | Where-Object { $_.Line -notmatch 'var\(--font-size-(sm|md|lg)\)' })
$sizeHits | ForEach-Object { Write-Host "  size: $($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
if ($sizeHits.Count -eq 0) { $summary += 'OK   every font-size comes from a token' } else { $summary += 'FAIL a font-size is not from a token (see above)' }
$inline = @(Get-ChildItem 'src' -Recurse -File -Include *.tsx | Where-Object { $_.Name -notmatch '\.test\.tsx$' } | Select-String -Pattern 'style=\{\{')
$inline | ForEach-Object { Write-Host "  inline style: $($_.Path):$($_.LineNumber)" }
if ($inline.Count -eq 0) { $summary += 'OK   no inline styles in components' } else { $summary += 'FAIL inline styles in components (see above)' }

# 9. No debug output with user data, no cookies, no debugger statements in the app or the server code
Write-Host "`n== Proof: no console.log, document.cookie or debugger in src and api =="
$codeFiles = Get-ChildItem @('src', 'api') -Recurse -File -Include *.ts, *.tsx | Where-Object { $_.Name -notmatch '\.test\.tsx?$' }
$debugHits = @($codeFiles | Select-String -Pattern 'console\.(log|debug)|document\.cookie|\bdebugger\b|[sS]et-[cC]ookie')
$debugHits | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
if ($debugHits.Count -eq 0) { $summary += 'OK   no console.log, cookies or debugger in src and api' } else { $summary += 'FAIL console.log, cookie or debugger in code (see above)' }

# 10. New texts: no "safe/forbidden", no guarantees, no percent. The privacy statement is the one the plan asks for.
Write-Host "`n== Proof: the texts of the About, Privacy and Disclaimer screens =="
$uk = Get-Content 'src\i18n\uk.ts' -Raw -Encoding UTF8
$pattern = '\u0431\u0435\u0437\u043f\u0435\u0447\u043d|\u0437\u0430\u0431\u043e\u0440\u043e\u043d|\u0433\u0430\u0440\u0430\u043d\u0442|\u0430\u0431\u0441\u043e\u043b\u044e\u0442\u043d|%'
foreach ($pair in @(@('about', "`n  about: {", "`n  privacy: {"), @('privacy', "`n  privacy: {", "`n  disclaimerPage: {"), @('disclaimerPage', "`n  disclaimerPage: {", "`n  update: {"))) {
  $from = $uk.IndexOf($pair[1])
  $to = $uk.IndexOf($pair[2], [Math]::Max($from, 0))
  if ($from -lt 0 -or $to -le $from) { Write-Host "$($pair[0]) block not found" -ForegroundColor Red; $summary += "FAIL $($pair[0]) block not found in uk.ts"; continue }
  $block = $uk.Substring($from, $to - $from)
  $bad = [regex]::Matches($block, $pattern, 'IgnoreCase')
  Write-Host "in uk.ts ($($pair[0]) block): $($bad.Count)"
  $bad | ForEach-Object { Write-Host "  $($_.Value)" -ForegroundColor Red }
  if ($bad.Count -eq 0) { $summary += "OK   no forbidden words, guarantees or percent in the $($pair[0]) texts" } else { $summary += "FAIL a forbidden word or a percent is in the $($pair[0]) texts" }
}
$updateText = [regex]::Unescape('\u0414\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u043d\u043e\u0432\u0430 \u0432\u0435\u0440\u0441\u0456\u044f')
if ($uk.Contains("'" + $updateText + "'")) { $summary += 'OK   the update message is in the dictionary' } else { $summary += 'FAIL the update message is missing or changed' }
$serverSentence = [regex]::Unescape('\u0417\u043d\u0456\u043c\u043e\u043a \u043d\u0435 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u0454\u0442\u044c\u0441\u044f \u043d\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0456')
if ($uk.Contains($serverSentence)) { $summary += 'OK   the privacy text says the photo is not stored on the server' } else { $summary += 'FAIL the privacy text lost the statement about the server' }

# 11. Tests of stage 13 and of the screens that changed
Write-Host "`n== Proof: tokens, PWA notifier, versions, About, profile, routes (tests) =="
$testOut = (npx vitest run src/styles src/lib/pwa src/content src/features/about src/features/profile src/features/journal src/app 2>&1 | Out-String)
$testExit = $LASTEXITCODE
Write-Host 'Failed tests and files:'
$testOut -split "`n" | Where-Object { $_ -match '^\s*(FAIL|Test Files|Tests )' } | Select-Object -First 40 | ForEach-Object { Write-Host $_ }
Write-Host 'Details of the first failures:'
$testOut -split "`n" | Select-String -Pattern 'AssertionError|TestingLibraryElementError|Error:' -Context 0,3 | Select-Object -First 12 | ForEach-Object { Write-Host $_ }
if ($testExit -eq 0) { $summary += 'OK   stage 13 tests pass' } else { $summary += 'FAIL stage 13 tests' }

# 12. No content files changed except the new version file
Write-Host "`n== Proof: stage 13 did not change the content files (version.json is new) =="
$changed = @(git status --short -- 'src/content/*.json' | Where-Object { $_ -notmatch 'version\.json' })
if ($changed.Count -eq 0) { $summary += 'OK   src/content/*.json unchanged (except the new version.json)' } else { $changed | ForEach-Object { Write-Host $_ -ForegroundColor Red }; $summary += 'FAIL src/content/*.json changed' }
$ver = Get-Content 'src\content\version.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$pkgVersion = (Get-Content 'package.json' -Raw -Encoding UTF8 | ConvertFrom-Json).version
Write-Host "package.json version: $pkgVersion, version.json appVersion: $($ver.appVersion)"
if ($ver.appVersion -eq $pkgVersion) { $summary += "OK   app version $pkgVersion is the same in package.json and version.json" } else { $summary += 'FAIL app version differs between package.json and version.json' }

# 13. No leftovers of the working files
Write-Host "`n== Proof: no temporary files in the project =="
$tmp = @(Get-ChildItem -Force -Filter 'tsconfig.tmp*' -ErrorAction SilentlyContinue)
if ($tmp.Count -eq 0) { $summary += 'OK   no tsconfig.tmp.json' } else { $summary += 'FAIL tsconfig.tmp.json is in the project' }

# 14. Dependencies: audit and unused packages
Write-Host "`n== npm audit --omit=dev =="
$auditJson = (npm audit --omit=dev --json 2>$null | Out-String)
try {
  $vul = ($auditJson | ConvertFrom-Json).metadata.vulnerabilities
  Write-Host "info: $($vul.info), low: $($vul.low), moderate: $($vul.moderate), high: $($vul.high), critical: $($vul.critical)"
  if (($vul.high + $vul.critical) -eq 0) { $summary += "OK   npm audit: no high or critical (moderate: $($vul.moderate), low: $($vul.low))" }
  else { npm audit --omit=dev; $summary += 'FAIL npm audit has high or critical vulnerabilities (see above)' }
} catch { Write-Host $auditJson; $summary += 'FAIL npm audit output could not be read' }
Write-Host "`n== npx depcheck =="
$depOut = (npx --yes depcheck 2>&1 | Out-String)
Write-Host $depOut
# depcheck cannot see the Vite alias @fixtures or the virtual module virtual:pwa-register: those "missing" lines are false positives.
if ($depOut -match 'Unused') { $summary += 'WARN depcheck lists unused packages (see above, send it to Claude)' }
else { $summary += 'OK   depcheck: no unused packages (the missing lines are @fixtures and virtual:pwa-register, false positives)' }

# 15. The production build and the PWA files
Write-Host "`n== Proof: the production build =="
if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
npm run build
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run build' } else { $summary += 'FAIL npm run build' }
if (Test-Path 'dist') {
  $dist = Get-ChildItem 'dist' -Recurse -File | Where-Object { $binaryExt -notcontains $_.Extension.ToLower() }
  $allDist = Get-ChildItem 'dist' -Recurse -File
  $maps = @($allDist | Where-Object { $_.Name -like '*.map' })
  if ($maps.Count -eq 0) { $summary += 'OK   dist has no source maps' } else { $summary += 'FAIL dist has source maps' }
  $hits = $dist | Select-String -SimpleMatch -Pattern 'skinbarrier-dev-state-page', '/dev/state' -List
  if (-not $hits) { $summary += 'OK   dist has no /dev/state' } else { $summary += 'FAIL dist contains /dev/state' }
  $keyHits = $dist | Select-String -Pattern 'ANTHROPIC|sk-ant|api\.anthropic\.com|x-api-key' -List
  if (-not $keyHits) { $summary += 'OK   dist has no key, no x-api-key and no address of the AI service' }
  else { $keyHits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL dist contains a key name or the address of the AI service' }

  if (Test-Path 'dist\sw.js') { $summary += 'OK   dist/sw.js exists' } else { $summary += 'FAIL dist/sw.js is missing' }
  if (Test-Path 'dist\manifest.webmanifest') {
    $mf = Get-Content 'dist\manifest.webmanifest' -Raw -Encoding UTF8 | ConvertFrom-Json
    Write-Host "manifest: name=$($mf.name) short_name=$($mf.short_name) display=$($mf.display) lang=$($mf.lang) icons=$(@($mf.icons).Count) theme=$($mf.theme_color)"
    if ($mf.display -eq 'standalone' -and $mf.short_name -and @($mf.icons).Count -ge 3) { $summary += 'OK   manifest: standalone, short_name, icons' } else { $summary += 'FAIL manifest is incomplete' }
    $missingIcons = @($mf.icons | Where-Object { -not (Test-Path ('dist' + ($_.src -replace '/', '\'))) })
    if ($missingIcons.Count -eq 0) { $summary += 'OK   every icon of the manifest is in dist' } else { $summary += 'FAIL an icon of the manifest is missing in dist' }
  } else { $summary += 'FAIL dist/manifest.webmanifest is missing' }
  $indexHtml = Get-Content 'dist\index.html' -Raw -Encoding UTF8
  if ($indexHtml -match 'rel="manifest"') { $summary += 'OK   index.html links the manifest' } else { $summary += 'FAIL index.html has no manifest link' }
  $inlineScripts = [regex]::Matches($indexHtml, '<script(?![^>]*\bsrc=)[^>]*>')
  if ($inlineScripts.Count -eq 0) { $summary += 'OK   index.html has no inline scripts (the CSP forbids them)' } else { $summary += 'FAIL index.html has an inline script: the CSP would block it' }

  # The service worker must not cache /api/: the rule and the navigation exclusion must be in the generated file
  if (Test-Path 'dist\sw.js') {
    $sw = Get-Content 'dist\sw.js' -Raw -Encoding UTF8
    $apiMentions = [regex]::Matches($sw, '/api\\?/')
    Write-Host "mentions of /api/ in sw.js: $($apiMentions.Count)"
    [regex]::Matches($sw, '.{0,80}/api\\?/.{0,40}') | ForEach-Object { Write-Host "  $($_.Value)" }
    if ($apiMentions.Count -ge 2) { $summary += 'OK   sw.js has the /api/ rule and the navigation exclusion' } else { $summary += 'FAIL sw.js does not mention /api/ twice: check the rule' }
    if ($sw -match 'NetworkOnly|networkOnly') { $summary += 'OK   sw.js has a network-only strategy' } else { Write-Host 'NetworkOnly name not found (the build may have renamed it); read the lines above' -ForegroundColor Yellow; $summary += 'WARN sw.js: network-only name not found, read the /api/ lines' }
    $apiPrecached = @([regex]::Matches($sw, 'url:"[^"]*api/[^"]*"'))
    if ($apiPrecached.Count -eq 0) { $summary += 'OK   no /api/ file is precached' } else { $summary += 'FAIL an /api/ path is in the precache list' }
  }
}

# 16. Headers in vercel.json (the real check is curl -I on the deployed address)
Write-Host "`n== Proof: vercel.json has the security headers and the sw.js rule =="
$vj = Get-Content 'vercel.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$allHeaders = @($vj.headers | ForEach-Object { $_.headers | ForEach-Object { $_.key } })
$needed = 'Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'
$missingHeaders = @($needed | Where-Object { $allHeaders -notcontains $_ })
if ($missingHeaders.Count -eq 0) { $summary += 'OK   vercel.json has all five security headers' } else { $summary += "FAIL vercel.json lacks: $($missingHeaders -join ', ')" }
$swRule = @($vj.headers | Where-Object { $_.source -eq '/sw.js' })
if ($swRule.Count -eq 1) { $summary += 'OK   vercel.json has the no-cache rule for /sw.js' } else { $summary += 'FAIL vercel.json lacks the /sw.js rule' }
Write-Host 'NOTE: curl -I against a deployed address is not possible without a deployment and was not run.' -ForegroundColor Yellow

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object {
  if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green }
  elseif ($_ -like 'WARN*') { Write-Host $_ -ForegroundColor Yellow }
  else { Write-Host $_ -ForegroundColor Red }
}
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
