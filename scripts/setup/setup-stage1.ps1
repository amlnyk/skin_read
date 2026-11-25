# Stage 1: install dependencies, run all checks, run the two security probes.
# Run from anywhere:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage1.ps1
# Nothing is committed or pushed by this script.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"

function Fail($msg) { Write-Host "STOP: $msg" -ForegroundColor Red; exit 1 }

# 0. Remove .gitkeep from folders that now contain real files
foreach ($d in @('src\app', 'src\ui', 'src\styles', 'src\features\scan', 'src\features\profile', 'src\features\reference', 'src\content')) {
  if (Test-Path "$d\.gitkeep") { Remove-Item "$d\.gitkeep" -Force; Write-Host "Removed $d\.gitkeep" }
}

# 1. Runtime dependencies
Write-Host "`n== npm install (runtime) =="
npm install react react-dom react-router-dom zustand zod idb-keyval
if ($LASTEXITCODE -ne 0) { Fail 'npm install (runtime) failed. Copy the error text and send it to Claude.' }

# 2. Dev dependencies
Write-Host "`n== npm install (dev) =="
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom vitest jsdom @testing-library/react @testing-library/jest-dom eslint typescript-eslint eslint-plugin-react eslint-plugin-react-hooks prettier
if ($LASTEXITCODE -ne 0) { Fail 'npm install (dev) failed. Copy the error text and send it to Claude.' }

# 3. Audit for high and critical vulnerabilities
Write-Host "`n== npm audit =="
npm audit --audit-level=high
if ($LASTEXITCODE -ne 0) { Write-Host 'npm audit reported high or critical issues: send the output to Claude.' -ForegroundColor Yellow }

# 4. All checks
Write-Host "`n== npm run check =="
npm run check
$checkCode = $LASTEXITCODE

# 5. Probe: hex colors outside tokens.css
Write-Host "`n== Probe: hex colors outside tokens.css =="
$hex = Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Where-Object { $_.Name -ne 'tokens.css' } | Select-String -Pattern '#[0-9a-fA-F]{3,8}\b'
if ($hex) { $hex | ForEach-Object { Write-Host $_ }; Write-Host 'FAIL: hex colors found outside tokens.css' -ForegroundColor Red } else { Write-Host 'OK: none' -ForegroundColor Green }

# 6. Probe: lint must fail on dangerouslySetInnerHTML
Write-Host "`n== Probe: lint rejects dangerouslySetInnerHTML =="
$probe = 'src\lintProbe.tsx'
Set-Content -Path $probe -Value 'export const Probe = () => <div dangerouslySetInnerHTML={{ __html: "x" }} />;'
npx eslint $probe *> $null
if ($LASTEXITCODE -ne 0) { Write-Host 'OK: lint rejected it as expected' -ForegroundColor Green } else { Write-Host 'FAIL: lint accepted dangerouslySetInnerHTML' -ForegroundColor Red }
Remove-Item $probe -Force

# 7. Installed versions (to fill the version column in docs/STACK.md)
Write-Host "`n== Installed versions =="
npm ls --depth=0

if ($checkCode -eq 0) { Write-Host "`nDone: npm run check passed." -ForegroundColor Green } else { Write-Host "`nnpm run check FAILED (see above). Send the output to Claude." -ForegroundColor Red }
