# Stage 2: install tsx, remove replaced files, format, run all checks, run the proofs.
# Run from anywhere in Windows PowerShell (not UCRT64):
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage2.ps1
# Nothing is committed or pushed by this script.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"

function Fail($msg) { Write-Host "STOP: $msg" -ForegroundColor Red; exit 1 }
$summary = @()

# 1. Files replaced by stage 2
Write-Host "`n== Removing replaced files =="
foreach ($old in @('scripts\content-audit.mjs', 'src\store\onboardingStore.ts')) {
  if (Test-Path $old) { Remove-Item $old -Force; Write-Host "Removed $old" } else { Write-Host "Already gone: $old" }
}
Get-ChildItem -Recurse -Force -Filter '.gitkeep' -File | Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\.git\\' } | ForEach-Object {
  $others = Get-ChildItem -Force -Path $_.DirectoryName | Where-Object { $_.Name -ne '.gitkeep' }
  if ($others) { Remove-Item $_.FullName -Force; Write-Host "Removed $($_.FullName)" }
}

# 2. New dev tooling
Write-Host "`n== npm install -D tsx =="
npm install -D tsx
if ($LASTEXITCODE -ne 0) { Fail 'npm install failed. Copy the error text and send it to Claude.' }

# 3. Audit of dependencies
Write-Host "`n== npm audit =="
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Write-Host 'npm audit reported high or critical issues: send the output to Claude.' -ForegroundColor Yellow }

# 4. Format everything once, then run all checks
Write-Host "`n== prettier --write =="
npx prettier --write . | Out-Null
Write-Host "`n== npm run check =="
npm run check
$checkCode = $LASTEXITCODE
if ($checkCode -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

# 5. Content audit: placeholders and one draft (the disclaimer), then strict mode must fail
Write-Host "`n== npm run content:audit =="
$auditOut = (npm run content:audit 2>&1 | Out-String)
Write-Host $auditOut
if ($auditOut -match 'placeholder: 15, draft: 1, verified: 0') { $summary += 'OK   content:audit counts (15 placeholder, 1 draft, 0 verified)' }
else { $summary += 'FAIL content:audit counts differ from the expected 15/1/0' }

Write-Host "`n== npm run content:audit -- --strict (must fail) =="
npm run content:audit -- --strict --no-write 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host 'OK   strict mode stopped (non-verified records exist)' -ForegroundColor Green; $summary += 'OK   content:audit --strict exits with 1' }
else { Write-Host 'FAIL strict mode did not stop' -ForegroundColor Red; $summary += 'FAIL content:audit --strict exits with 1' }

# 6. Proof: the production build has no developer screen
Write-Host "`n== Proof: /dev/state is absent from the production build =="
if (Test-Path 'dist') { Remove-Item 'dist' -Recurse -Force }
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { $summary += 'FAIL npm run build (needed for the dist proof)' }
$hits = Get-ChildItem 'dist' -Recurse -File | Select-String -SimpleMatch -Pattern 'skinbarrier-dev-state-page', '/dev/state' -List
if (-not $hits) { Write-Host 'OK   no dev-state marker or route in dist' -ForegroundColor Green; $summary += 'OK   dist has no /dev/state' }
else { $hits | ForEach-Object { Write-Host "FOUND in $($_.Path)" -ForegroundColor Red }; $summary += 'FAIL dist contains /dev/state' }

# 7. Proof: the new store boundary is enforced
Write-Host "`n== Proof: ESLint store boundary =="
function Probe($label, $relPath, $content, $expectFail) {
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $relPath), $content)
  $out = (npx eslint $relPath 2>&1 | Out-String)
  $code = $LASTEXITCODE
  Remove-Item $relPath -Force
  $failed = ($code -ne 0)
  if ($failed -eq $expectFail) { Write-Host "OK   $label" -ForegroundColor Green; $script:summary += "OK   $label" }
  else { Write-Host "FAIL $label" -ForegroundColor Red; Write-Host $out; $script:summary += "FAIL $label" }
}
Probe 'store imports lib/storage: rejected' 'src\store\probeA.ts' ((@("import { createMemoryAdapter } from '@/lib/storage';", "export const probe = createMemoryAdapter;") -join "`n") + "`n") $true
Probe 'schemas import zustand: rejected' 'src\schemas\probeB.ts' ((@("import { create } from 'zustand';", "export const probe = create;") -join "`n") + "`n") $true
Probe 'store imports lib/ports: accepted' 'src\store\probeOk.ts' ((@("import type { StorageAdapter } from '@/lib/ports';", "export type Probe = StorageAdapter;") -join "`n") + "`n") $false

# 8. Versions and state
Write-Host "`n== Installed versions (tsx) =="
npm ls tsx --depth=0
Write-Host "`n== git status =="
git status --short

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
