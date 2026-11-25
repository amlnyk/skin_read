# Stage 1B: install new tooling, place GitHub files, format, run all checks, run the proofs.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage1b.ps1
# Nothing is committed or pushed by this script.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"

function Fail($msg) { Write-Host "STOP: $msg" -ForegroundColor Red; exit 1 }
$summary = @()

# 0. GitHub files (the tool that writes my files cannot write into .github, so I stage them in scripts\_github)
Write-Host "`n== GitHub files =="
New-Item -ItemType Directory -Force -Path '.github\workflows' | Out-Null
if (Test-Path 'scripts\_github\ci.yml') { Move-Item -Force 'scripts\_github\ci.yml' '.github\workflows\ci.yml' }
if (Test-Path 'scripts\_github\pull_request_template.md') { Move-Item -Force 'scripts\_github\pull_request_template.md' '.github\pull_request_template.md' }
if (Test-Path 'scripts\_github') { Remove-Item 'scripts\_github' -Recurse -Force }
if (-not (Test-Path '.github\workflows\ci.yml')) { Fail '.github\workflows\ci.yml is missing' }
if (-not (Test-Path '.github\pull_request_template.md')) { Fail '.github\pull_request_template.md is missing' }
Write-Host 'OK: ci.yml and pull_request_template.md are in .github'

# 1. Remove .gitkeep from folders that now contain real files
Write-Host "`n== .gitkeep cleanup =="
Get-ChildItem -Recurse -Force -Filter '.gitkeep' -File | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' } | ForEach-Object {
  $others = Get-ChildItem -Force -Path $_.DirectoryName | Where-Object { $_.Name -ne '.gitkeep' }
  if ($others) { Remove-Item $_.FullName -Force; Write-Host "Removed $($_.FullName)" }
}

# 2. New dev tooling
Write-Host "`n== npm install (new dev tooling) =="
npm install -D husky lint-staged @vitest/coverage-v8 eslint-plugin-jsx-a11y @types/node
if ($LASTEXITCODE -ne 0) { Fail 'npm install failed. Copy the error text and send it to Claude.' }

# 3. husky replaces the old local hook
Write-Host "`n== husky =="
npm run prepare
# The tool that writes my files cannot write into .husky, so the hook file is created here (LF line endings, required by sh).
New-Item -ItemType Directory -Force -Path '.husky' | Out-Null
$hook = @(
  'npx lint-staged',
  '',
  'if ! command -v gitleaks >/dev/null 2>&1; then',
  '  echo "gitleaks not found in PATH. Commit from Windows PowerShell. Commit stopped."',
  '  exit 1',
  'fi',
  'gitleaks protect --staged --redact -v'
) -join "`n"
[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.husky\pre-commit'), $hook + "`n")
Write-Host 'OK: .husky\pre-commit written'
if (Test-Path '.git\hooks\pre-commit') { Remove-Item '.git\hooks\pre-commit' -Force; Write-Host 'Removed the old local .git\hooks\pre-commit (husky replaces it)' }
git config core.hooksPath

# 4. Audit
Write-Host "`n== npm audit =="
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Write-Host 'npm audit reported high or critical issues: send the output to Claude.' -ForegroundColor Yellow }

# 5. Format everything once, then run all checks
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
$checkCode = $LASTEXITCODE
if ($checkCode -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

# 6. Proofs: lint must reject deliberate violations and accept correct code
Write-Host "`n== Proofs: ESLint rules =="
function Probe($label, $relPath, $content, $expectFail) {
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $relPath), $content)
  $out = (npx eslint $relPath 2>&1 | Out-String)
  $code = $LASTEXITCODE
  Remove-Item $relPath -Force
  $failed = ($code -ne 0)
  if ($failed -eq $expectFail) {
    Write-Host "OK   $label" -ForegroundColor Green
    $script:summary += "OK   $label"
    if ($expectFail) { ($out -split "`n" | Where-Object { $_ -match 'error' } | Select-Object -First 1) | ForEach-Object { Write-Host "       $_" } }
  } else {
    Write-Host "FAIL $label" -ForegroundColor Red
    Write-Host $out
    $script:summary += "FAIL $label"
  }
}

$ua = -join ([char[]](0x041F, 0x0440, 0x0438, 0x0432, 0x0456, 0x0442))   # a Ukrainian word, built from code points

Probe 'store imported in logic is rejected' 'src\logic\safety\probeA.ts' ((@("import { useOnboardingStore } from '@/store';", "export const probe = useOnboardingStore;") -join "`n") + "`n") $true
Probe 'feature imports another feature: rejected' 'src\features\home\probeB.ts' ((@("import { CarePage } from '@/features/care';", "export const probe = CarePage;") -join "`n") + "`n") $true
Probe 'deep import into a feature (bypass of index.ts): rejected' 'src\app\probeC.ts' ((@("import { HomePage } from '@/features/home/pages/HomePage';", "export const probe = HomePage;") -join "`n") + "`n") $true
Probe 'long relative import (../../../): rejected' 'src\features\home\pages\probeD.ts' ((@("import { MedicalDisclaimer } from '../../../ui';", "export const probe = MedicalDisclaimer;") -join "`n") + "`n") $true
Probe 'bare Ukrainian text in JSX: rejected' 'src\features\home\pages\probeE.tsx' ((@("export const Probe = () => <p>$ua</p>;") -join "`n") + "`n") $true
Probe 'hard-coded aria-label in JSX: rejected' 'src\features\home\pages\probeF.tsx' ((@("export const Probe = () => <button type=""button"" aria-label=""Close"" />;") -join "`n") + "`n") $true
Probe 'Date.now() in logic: rejected' 'src\logic\safety\probeG.ts' ((@("export const probe = () => Date.now();") -join "`n") + "`n") $true
Probe 'react imported in logic: rejected' 'src\logic\safety\probeH.ts' ((@("import { useState } from 'react';", "export const probe = useState;") -join "`n") + "`n") $true
Probe 'correct logic file (lib/result): accepted' 'src\logic\safety\probeOk.ts' ((@("import { ok } from '@/lib/result';", "export const probe = ok(1);") -join "`n") + "`n") $false
Probe 'correct JSX with t(): accepted' 'src\features\home\pages\probeOk2.tsx' ((@("import { t } from '@/i18n';", "export const Probe = () => <p>{t('nav.home')}</p>;") -join "`n") + "`n") $false

# 7. Proof: pre-commit hook stops a fake secret (nothing is committed)
Write-Host "`n== Proof: pre-commit stops a fake key =="
$fake = 'fake-key-probe.txt'
$token = 'ghp' + '_' + '1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvWxYz'
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $fake), "token = $token`n")
git add -f $fake
git hook run pre-commit
$hookCode = $LASTEXITCODE
git reset -q -- $fake
Remove-Item $fake -Force
if ($hookCode -ne 0) { Write-Host 'OK   pre-commit stopped the fake key' -ForegroundColor Green; $summary += 'OK   pre-commit stops a fake key' }
else { Write-Host 'FAIL pre-commit did NOT stop the fake key' -ForegroundColor Red; $summary += 'FAIL pre-commit stops a fake key' }

# 8. Versions and state
Write-Host "`n== Installed versions =="
npm ls --depth=0
Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
