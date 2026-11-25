# Stage 14: security audit before the release. Install, check, attack what can be attacked without
# a deployment, scan the whole git history. Nothing is committed or pushed.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage14.ps1
# ASCII only on purpose (Windows PowerShell 5.1 misreads Cyrillic without BOM); Cyrillic is \u escaped.
# Not checked here (needs a deployment, a phone or the Anthropic account): curl -I on the live site,
# 404 for service files on the live site, cookies in DevTools, the spending limit. See docs/security-report.md.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent $PSScriptRoot)
Write-Host "Project folder: $(Get-Location)"
$summary = @()
$binaryExt = '.png', '.jpg', '.jpeg', '.ico', '.gif', '.webp', '.woff', '.woff2'

Write-Host "`n== npm install =="
npm install
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm install' } else { $summary += 'FAIL npm install' }

# 1. Secrets in the whole git history (A.6 no. 2)
Write-Host "`n== gitleaks: the whole git history =="
if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
  gitleaks detect --source . --redact -v
  $leakExit = $LASTEXITCODE
  if ($leakExit -ne 0 -and $leakExit -ne 1) {
    # newer versions: "gitleaks git"
    gitleaks git . --redact -v
    $leakExit = $LASTEXITCODE
  }
  if ($leakExit -eq 0) { $summary += 'OK   gitleaks: no leaks in the whole history' } else { $summary += 'FAIL gitleaks found something (STOP: see docs/security-report.md, A.7)' }
} else { $summary += 'FAIL gitleaks is not installed or not in PATH' }

# 2. Secret-looking words in src, api (the hits are printed; only real secrets fail)
Write-Host "`n== grep: sk-, ANTHROPIC, API_KEY, token, secret, password in src and api =="
$code = Get-ChildItem @('src', 'api') -Recurse -File -Include *.ts, *.tsx, *.json | Where-Object { $_.Name -notmatch '\.test\.tsx?$' -and $_.Name -ne 'testKit.ts' }
$words = @($code | Select-String -Pattern 'sk-|ANTHROPIC|API_KEY|token|secret|password' -CaseSensitive:$false)
$words | ForEach-Object { Write-Host "  $($_.Path | Resolve-Path -Relative):$($_.LineNumber): $($_.Line.Trim())" }
$real = @($code | Select-String -Pattern 'sk-ant-[A-Za-z0-9_-]{10,}|ANTHROPIC_API_KEY\s*[:=]\s*[''"][^''"]+[''"]')
if ($real.Count -eq 0) { $summary += "OK   no real secret in src and api ($($words.Count) lines with the words, read them above)" } else { $summary += 'FAIL a secret value is in src or api (STOP)' }
$apiKeyFiles = @($code | Select-String -Pattern 'ANTHROPIC_API_KEY' -List | ForEach-Object { $_.Path | Resolve-Path -Relative })
Write-Host "files that read ANTHROPIC_API_KEY: $($apiKeyFiles -join ', ')"
if (@($apiKeyFiles | Where-Object { $_ -notmatch '^\.\\api\\' }).Count -eq 0) { $summary += 'OK   ANTHROPIC_API_KEY is read only in api/' } else { $summary += 'FAIL ANTHROPIC_API_KEY is read outside api/' }

# 3. VITE_ variables hold no secrets; .env.example has names only
Write-Host "`n== .env.example and VITE_ names =="
$envLines = Get-Content '.env.example' | Where-Object { $_ -match '^[A-Z_]+=' }
$withValues = @($envLines | Where-Object { $_ -notmatch '=$' })
if ($withValues.Count -eq 0) { $summary += 'OK   .env.example has names only' } else { $summary += 'FAIL .env.example has values' }
$viteSecret = @($envLines | Where-Object { $_ -match '^VITE_.*(KEY|TOKEN|SECRET|PASSWORD)' })
if ($viteSecret.Count -eq 0) { $summary += 'OK   no VITE_ variable looks like a secret' } else { $summary += 'FAIL a VITE_ variable looks like a secret' }
$ignored = @(git check-ignore .env .env.local .env.production)
if ($ignored.Count -eq 3) { $summary += 'OK   .env files are ignored by git' } else { $summary += 'FAIL a .env file is not ignored' }

# 4. XSS sinks (A.1 no. 7)
Write-Host "`n== grep: dangerouslySetInnerHTML, innerHTML, eval, new Function, document.write =="
$sinks = @(Get-ChildItem @('src', 'api') -Recurse -File -Include *.ts, *.tsx | Where-Object { $_.Name -notmatch '\.test\.tsx?$' } | Select-String -Pattern 'dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|\beval\(|new Function|document\.write|srcdoc')
$sinks | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
if ($sinks.Count -eq 0) { $summary += 'OK   no HTML or code injection sinks in src and api' } else { $summary += 'FAIL an injection sink is in the code' }

# 4b. ESLint really stops a javascript: link
Write-Host "`n== ESLint: a javascript: link must be refused =="
$probe = 'src\lint-probe-stage14.tsx'
Set-Content -Path $probe -Encoding ASCII -Value "export function Probe() {`n  return <a href=""javascript:alert(1)"">{null}</a>;`n}"
$lintOut = (npx eslint $probe 2>&1 | Out-String)
Remove-Item $probe -Force
Write-Host $lintOut
if ($lintOut -match 'jsx-no-script-url') { $summary += 'OK   ESLint refuses javascript: links' } else { $summary += 'FAIL ESLint did not refuse a javascript: link' }

# 5. Dependencies (A.6 no. 20, 21)
Write-Host "`n== npm audit (all, for the report) =="
npm audit
Write-Host "`n== npm audit --omit=dev =="
$auditJson = (npm audit --omit=dev --json 2>$null | Out-String)
try {
  $vul = ($auditJson | ConvertFrom-Json).metadata.vulnerabilities
  Write-Host "production: low $($vul.low), moderate $($vul.moderate), high $($vul.high), critical $($vul.critical)"
  if (($vul.high + $vul.critical) -eq 0) { $summary += "OK   npm audit (production): no high or critical" } else { $summary += 'FAIL npm audit (production) has high or critical' }
} catch { $summary += 'FAIL npm audit output could not be read' }
$allJson = (npm audit --json 2>$null | Out-String)
try {
  $all = ($allJson | ConvertFrom-Json).metadata.vulnerabilities
  Write-Host "all incl. dev: low $($all.low), moderate $($all.moderate), high $($all.high), critical $($all.critical)"
  if (($all.high + $all.critical) -eq 0) { $summary += "OK   npm audit (with dev): no high or critical (moderate $($all.moderate))" } else { $summary += 'WARN npm audit (with dev) has high or critical: dev only, send it to Claude' }
} catch { }
Write-Host "`n== npx depcheck =="
$depOut = (npx --yes depcheck 2>&1 | Out-String)
Write-Host $depOut
if ($depOut -match 'Unused') { $summary += 'WARN depcheck lists unused packages (send it to Claude)' } else { $summary += 'OK   depcheck: no unused packages' }

# 6. All checks and the build
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
if ($auditOut -match 'placeholder: 23, draft: 55, verified: 0') { $summary += 'OK   content:audit counts unchanged (23/55/0)' } else { Write-Host $auditOut; $summary += 'FAIL content:audit counts changed' }

# 7. The tests of stage 14
Write-Host "`n== Tests: attacks, host config, home screen, app, api =="
$testOut = (npx vitest run src/test src/features/home src/app api 2>&1 | Out-String)
$testExit = $LASTEXITCODE
$testOut -split "`n" | Where-Object { $_ -match '^\s*(FAIL|Test Files|Tests )' } | Select-Object -First 40 | ForEach-Object { Write-Host $_ }
$testOut -split "`n" | Select-String -Pattern 'AssertionError|TestingLibraryElementError|Error:' -Context 0,3 | Select-Object -First 12 | ForEach-Object { Write-Host $_ }
if ($testExit -eq 0) { $summary += 'OK   stage 14 tests pass' } else { $summary += 'FAIL stage 14 tests' }

# 8. The production build (A.6 no. 1, 3, 4, 5, 23)
Write-Host "`n== The production build =="
if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
npm run build
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run build' } else { $summary += 'FAIL npm run build' }
if (Test-Path 'dist') {
  $allDist = Get-ChildItem 'dist' -Recurse -File -Force
  $textDist = $allDist | Where-Object { $binaryExt -notcontains $_.Extension.ToLower() }
  if (@($allDist | Where-Object { $_.Name -like '*.map' }).Count -eq 0) { $summary += 'OK   dist has no source maps' } else { $summary += 'FAIL dist has source maps' }
  $service = @($allDist | Where-Object { $_.Name -match '^\.env|^CLAUDE\.md$|^package(-lock)?\.json$|^vite\.config|^tsconfig' -or $_.FullName -match '\\content\\source\\|\\\.git\\' })
  $service | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Red }
  if ($service.Count -eq 0) { $summary += 'OK   dist has no service files (.env, CLAUDE.md, content/source, configs)' } else { $summary += 'FAIL dist has a service file' }
  $keyHits = $textDist | Select-String -Pattern 'ANTHROPIC|sk-ant|api\.anthropic\.com|x-api-key' -List
  if (-not $keyHits) { $summary += 'OK   dist has no key name and no AI address' } else { $summary += 'FAIL dist has a key name or the AI address' }
  $devHits = $textDist | Select-String -SimpleMatch -Pattern '/dev/state' -List
  if (-not $devHits) { $summary += 'OK   dist has no /dev/state' } else { $summary += 'FAIL dist has /dev/state' }
  $cookieHits = $textDist | Select-String -Pattern 'document\.cookie' -List
  if (-not $cookieHits) { $summary += 'OK   dist sets no cookies' } else { $summary += 'FAIL dist touches document.cookie' }
  if (Test-Path 'dist\sw.js') {
    $sw = Get-Content 'dist\sw.js' -Raw -Encoding UTF8
    if ([regex]::Matches($sw, '/api\\?/').Count -ge 2 -and $sw -match 'NetworkOnly') { $summary += 'OK   sw.js: /api/ is network only and not a navigation' } else { $summary += 'FAIL sw.js /api/ rules' }
  } else { $summary += 'FAIL dist/sw.js is missing' }
}

# 9. Release version
$pkgVersion = (Get-Content 'package.json' -Raw -Encoding UTF8 | ConvertFrom-Json).version
$ver = Get-Content 'src\content\version.json' -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host "`npackage.json: $pkgVersion, version.json: $($ver.appVersion)"
if ($pkgVersion -eq '1.0.0' -and $ver.appVersion -eq '1.0.0') { $summary += 'OK   version 1.0.0 everywhere' } else { $summary += 'FAIL version is not 1.0.0 everywhere' }

# 10. The home screen is no longer a stub, and its texts have no scores
$homePage = Get-Content 'src\features\home\pages\HomePage.tsx' -Raw -Encoding UTF8
if ($homePage -notmatch 'inDevelopment') { $summary += 'OK   the home screen is not a stub any more' } else { $summary += 'FAIL the home screen is still a stub' }
$uk = Get-Content 'src\i18n\uk.ts' -Raw -Encoding UTF8
$from = $uk.IndexOf("`n  home: {"); $to = $uk.IndexOf("`n  notFound: {")
if ($from -ge 0 -and $to -gt $from) {
  $bad = [regex]::Matches($uk.Substring($from, $to - $from), '\u0431\u0435\u0437\u043f\u0435\u0447\u043d|\u0437\u0430\u0431\u043e\u0440\u043e\u043d|\u0433\u0430\u0440\u0430\u043d\u0442|\u0431\u0430\u043b|\u043e\u0446\u0456\u043d\u043a|%', 'IgnoreCase')
  if ($bad.Count -eq 0) { $summary += 'OK   no forbidden words, scores or percent in the home texts' } else { $summary += 'FAIL a forbidden word or a percent in the home texts' }
} else { $summary += 'FAIL home block not found in uk.ts' }

# 11. Reports exist
foreach ($doc in 'docs\security-report.md', 'docs\tz-compliance.md') {
  if (Test-Path $doc) { $summary += "OK   $doc exists" } else { $summary += "FAIL $doc is missing" }
}
$tmp = @(Get-ChildItem -Force -Filter 'tsconfig.tmp*' -ErrorAction SilentlyContinue) + @(Get-ChildItem 'src' -Filter 'lint-probe*' -ErrorAction SilentlyContinue)
if ($tmp.Count -eq 0) { $summary += 'OK   no temporary files' } else { $summary += 'FAIL temporary files are left' }

Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object {
  if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green }
  elseif ($_ -like 'WARN*') { Write-Host $_ -ForegroundColor Yellow }
  else { Write-Host $_ -ForegroundColor Red }
}
Write-Host "`nStill for you (no script can do it): set the spending limit in the Anthropic console; on the first deployment run the curl lines from docs/security-report.md." -ForegroundColor Yellow
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
