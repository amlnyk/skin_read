# Stage 0 setup: git init, dependabot.yml, secret scan, first commit and tag.
# Run from the project root:
#   powershell -ExecutionPolicy Bypass -File scripts\setup-stage0.ps1
# It does NOT push anything and does NOT touch GitHub or Vercel.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"

function Fail($msg) { Write-Host "STOP: $msg" -ForegroundColor Red; exit 1 }

# 1. Environment check
foreach ($tool in @('git', 'node', 'npm')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Write-Host "MISSING: $tool is not installed or not in PATH" -ForegroundColor Yellow
  } else {
    Write-Host ("{0}: {1}" -f $tool, (& $tool --version))
  }
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git is required. Install Git for Windows, reopen the terminal, run again.' }

# 2. .github/dependabot.yml (the remote tool cannot write into .github)
New-Item -ItemType Directory -Force -Path '.github' | Out-Null
if (-not (Test-Path '.github\dependabot.yml')) {
  $dep = @'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
'@
  Set-Content -Path '.github\dependabot.yml' -Value $dep -Encoding UTF8
  Write-Host 'Created .github\dependabot.yml'
} else {
  Write-Host '.github\dependabot.yml already exists, left as is'
}

# 3. git init
if (-not (Test-Path '.git')) {
  git init -b main
  if ($LASTEXITCODE -ne 0) { Fail 'git init failed' }
} else {
  Write-Host 'Repository already initialised'
}

# 4. Secret scan (gitleaks), if installed
if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
  gitleaks detect --no-git --source . -v
  if ($LASTEXITCODE -ne 0) { Fail 'gitleaks found possible secrets. Nothing was committed.' }
  Write-Host 'gitleaks: no secrets found'
} else {
  Write-Host 'gitleaks is not installed: secret scan skipped. See docs\setup-security.md' -ForegroundColor Yellow
}

# 5. Commit and tag
git add -A
git status --short
$msg = "stage 0: repository setup and content inventory"
$trailer = "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`nClaude-Session: https://claude.ai/code/session_01JKD62wZrzXRYqxgyUUWk8m"
git commit -m $msg -m $trailer
if ($LASTEXITCODE -ne 0) {
  Fail 'commit failed. If git asks who you are, run: git config --global user.name "Your Name"  and  git config --global user.email "you@example.com"  then run this script again.'
}
git tag stage-0
Write-Host 'Done: committed and tagged stage-0 (local only, nothing pushed).' -ForegroundColor Green
