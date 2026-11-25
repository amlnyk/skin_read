# Restructure: files of different kinds no longer lie mixed in one folder
# (docs/architecture/ARCHITECTURE.md, section 3). Nothing is committed or pushed.
#   powershell -ExecutionPolicy Bypass -File scripts\setup\setup-structure.ps1
# ASCII only on purpose (Windows PowerShell 5.1).
#
# Claude has already written every file at its new place. This script removes the old copies,
# removes the folders left empty, formats and checks everything.

$ErrorActionPreference = 'Continue'
Set-Location (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Write-Host "Project folder: $(Get-Location)"
$summary = @()

# old place | new place
$moved = @(
  'api/_lib/guards.test.ts|api/_lib/__tests__/guards.test.ts',
  'api/_lib/handler.test.ts|api/_lib/__tests__/handler.test.ts',
  'api/_lib/testKit.ts|api/_lib/__tests__/testKit.ts',
  'api/_lib/visionProvider.test.ts|api/_lib/__tests__/visionProvider.test.ts',
  'api/entry.test.ts|api/__tests__/entry.test.ts',
  'docs/API.md|docs/architecture/API.md',
  'docs/ARCHITECTURE.md|docs/architecture/ARCHITECTURE.md',
  'docs/STACK.md|docs/architecture/STACK.md',
  'docs/accessibility.md|docs/quality/accessibility.md',
  'docs/ci-setup.md|docs/setup/ci-setup.md',
  'docs/content-guide.md|docs/content/content-guide.md',
  'docs/content-inventory.md|docs/content/content-inventory.md',
  'docs/decisions.md|docs/architecture/decisions.md',
  'docs/pwa.md|docs/architecture/pwa.md',
  'docs/security-report.md|docs/quality/security-report.md',
  'docs/setup-security.md|docs/setup/setup-security.md',
  'docs/states.md|docs/architecture/states.md',
  'docs/test-report.md|docs/quality/test-report.md',
  'docs/tz-compliance.md|docs/quality/tz-compliance.md',
  'scripts/content-audit.ts|scripts/content/audit.ts',
  'scripts/content-import.ts|scripts/content/import.ts',
  'scripts/setup-content-tables.ps1|scripts/setup/setup-content-tables.ps1',
  'scripts/setup-design.ps1|scripts/setup/setup-design.ps1',
  'scripts/setup-stage0.ps1|scripts/setup/setup-stage0.ps1',
  'scripts/setup-stage1.ps1|scripts/setup/setup-stage1.ps1',
  'scripts/setup-stage10.ps1|scripts/setup/setup-stage10.ps1',
  'scripts/setup-stage11.ps1|scripts/setup/setup-stage11.ps1',
  'scripts/setup-stage12.ps1|scripts/setup/setup-stage12.ps1',
  'scripts/setup-stage13.ps1|scripts/setup/setup-stage13.ps1',
  'scripts/setup-stage14.ps1|scripts/setup/setup-stage14.ps1',
  'scripts/setup-stage1b.ps1|scripts/setup/setup-stage1b.ps1',
  'scripts/setup-stage2.ps1|scripts/setup/setup-stage2.ps1',
  'scripts/setup-stage3.ps1|scripts/setup/setup-stage3.ps1',
  'scripts/setup-stage4.ps1|scripts/setup/setup-stage4.ps1',
  'scripts/setup-stage5.ps1|scripts/setup/setup-stage5.ps1',
  'scripts/setup-stage6.ps1|scripts/setup/setup-stage6.ps1',
  'scripts/setup-stage7.ps1|scripts/setup/setup-stage7.ps1',
  'scripts/setup-stage8.ps1|scripts/setup/setup-stage8.ps1',
  'scripts/setup-stage9.ps1|scripts/setup/setup-stage9.ps1',
  'src/app/DataCorruptedScreen.tsx|src/app/components/DataCorruptedScreen.tsx',
  'src/app/ErrorBoundary.module.css|src/app/components/ErrorBoundary.module.css',
  'src/app/ErrorBoundary.test.tsx|src/app/__tests__/ErrorBoundary.test.tsx',
  'src/app/ErrorBoundary.tsx|src/app/components/ErrorBoundary.tsx',
  'src/app/Layout.module.css|src/app/components/Layout.module.css',
  'src/app/Layout.test.tsx|src/app/__tests__/Layout.test.tsx',
  'src/app/Layout.tsx|src/app/components/Layout.tsx',
  'src/app/NotFoundPage.module.css|src/app/pages/NotFoundPage.module.css',
  'src/app/NotFoundPage.tsx|src/app/pages/NotFoundPage.tsx',
  'src/app/PersistenceGate.module.css|src/app/components/PersistenceGate.module.css',
  'src/app/PersistenceGate.test.tsx|src/app/__tests__/PersistenceGate.test.tsx',
  'src/app/PersistenceGate.tsx|src/app/components/PersistenceGate.tsx',
  'src/app/UpdateBanner.module.css|src/app/components/UpdateBanner.module.css',
  'src/app/UpdateBanner.test.tsx|src/app/__tests__/UpdateBanner.test.tsx',
  'src/app/UpdateBanner.tsx|src/app/components/UpdateBanner.tsx',
  'src/app/app.config.test.ts|src/app/__tests__/app.config.test.ts',
  'src/app/compositionRoot.test.ts|src/app/__tests__/compositionRoot.test.ts',
  'src/app/guards/OnboardingGuard.test.tsx|src/app/guards/__tests__/OnboardingGuard.test.tsx',
  'src/app/router.test.tsx|src/app/__tests__/router.test.tsx',
  'src/content/audit.test.ts|src/content/__tests__/audit.test.ts',
  'src/content/bundled.test.ts|src/content/__tests__/bundled.test.ts',
  'src/content/compat-rules.json|src/content/data/compat-rules.json',
  'src/content/conditions.json|src/content/data/conditions.json',
  'src/content/disclaimer.json|src/content/data/disclaimer.json',
  'src/content/import/importSheets.test.ts|src/content/import/__tests__/importSheets.test.ts',
  'src/content/import/sync.test.ts|src/content/import/__tests__/sync.test.ts',
  'src/content/ingredient-groups.json|src/content/data/ingredient-groups.json',
  'src/content/ingredients.json|src/content/data/ingredients.json',
  'src/content/loader.test.ts|src/content/__tests__/loader.test.ts',
  'src/content/observation-templates.json|src/content/data/observation-templates.json',
  'src/content/policy.test.ts|src/content/__tests__/policy.test.ts',
  'src/content/product-categories.json|src/content/data/product-categories.json',
  'src/content/profileContent.test.ts|src/content/__tests__/profileContent.test.ts',
  'src/content/questionnaire.json|src/content/data/questionnaire.json',
  'src/content/questionnaire.test.ts|src/content/__tests__/questionnaire.test.ts',
  'src/content/recommendations.json|src/content/data/recommendations.json',
  'src/content/routine-steps.json|src/content/data/routine-steps.json',
  'src/content/safety-messages.json|src/content/data/safety-messages.json',
  'src/content/skin-types.json|src/content/data/skin-types.json',
  'src/content/version.json|src/content/data/version.json',
  'src/content/version.test.ts|src/content/__tests__/version.test.ts',
  'src/features/about/about.module.css|src/features/about/styles/about.module.css',
  'src/features/about/about.test.tsx|src/features/about/__tests__/about.test.tsx',
  'src/features/about/summarizeContent.test.ts|src/features/about/__tests__/summarizeContent.test.ts',
  'src/features/about/summarizeContent.ts|src/features/about/utils/summarizeContent.ts',
  'src/features/compare/compare.module.css|src/features/compare/styles/compare.module.css',
  'src/features/compare/compare.test.tsx|src/features/compare/__tests__/compare.test.tsx',
  'src/features/compare/parsePrice.ts|src/features/compare/utils/parsePrice.ts',
  'src/features/compare/useCompareSources.ts|src/features/compare/hooks/useCompareSources.ts',
  'src/features/compat/compat.test.tsx|src/features/compat/__tests__/compat.test.tsx',
  'src/features/compat/labels.ts|src/features/compat/utils/labels.ts',
  'src/features/dev/DevStatePage.test.tsx|src/features/dev/__tests__/DevStatePage.test.tsx',
  'src/features/dev/exampleData.ts|src/features/dev/utils/exampleData.ts',
  'src/features/home/HomePage.test.tsx|src/features/home/__tests__/HomePage.test.tsx',
  'src/features/home/home.module.css|src/features/home/styles/home.module.css',
  'src/features/home/useHomeSummary.ts|src/features/home/hooks/useHomeSummary.ts',
  'src/features/journal/describeEntry.ts|src/features/journal/utils/describeEntry.ts',
  'src/features/journal/dynamics.test.tsx|src/features/journal/__tests__/dynamics.test.tsx',
  'src/features/journal/journal.test.tsx|src/features/journal/__tests__/journal.test.tsx',
  'src/features/journal/today.ts|src/features/journal/utils/today.ts',
  'src/features/onboarding/OnboardingPage.test.tsx|src/features/onboarding/__tests__/OnboardingPage.test.tsx',
  'src/features/products/products.module.css|src/features/products/styles/products.module.css',
  'src/features/products/products.test.tsx|src/features/products/__tests__/products.test.tsx',
  'src/features/profile/components/TextBlocks.test.tsx|src/features/profile/components/__tests__/TextBlocks.test.tsx',
  'src/features/profile/describeProfile.ts|src/features/profile/utils/describeProfile.ts',
  'src/features/profile/labels.ts|src/features/profile/utils/labels.ts',
  'src/features/profile/profile.test.tsx|src/features/profile/__tests__/profile.test.tsx',
  'src/features/reference/reference.test.tsx|src/features/reference/__tests__/reference.test.tsx',
  'src/features/routine/analysis.test.tsx|src/features/routine/__tests__/analysis.test.tsx',
  'src/features/routine/describe.ts|src/features/routine/utils/describe.ts',
  'src/features/routine/describeObservation.ts|src/features/routine/utils/describeObservation.ts',
  'src/features/routine/routine.test.tsx|src/features/routine/__tests__/routine.test.tsx',
  'src/features/routine/today.ts|src/features/routine/utils/today.ts',
  'src/features/scan/describe.ts|src/features/scan/utils/describe.ts',
  'src/features/scan/labels.ts|src/features/scan/utils/labels.ts',
  'src/features/scan/photo.test.tsx|src/features/scan/__tests__/photo.test.tsx',
  'src/features/scan/scan.module.css|src/features/scan/styles/scan.module.css',
  'src/features/scan/scan.test.tsx|src/features/scan/__tests__/scan.test.tsx',
  'src/features/settings/dataCategories.test.ts|src/features/settings/__tests__/dataCategories.test.ts',
  'src/features/settings/dataCategories.ts|src/features/settings/utils/dataCategories.ts',
  'src/features/settings/format.ts|src/features/settings/utils/format.ts',
  'src/features/settings/reminders.ts|src/features/settings/utils/reminders.ts',
  'src/features/settings/settings.module.css|src/features/settings/styles/settings.module.css',
  'src/features/settings/settings.test.tsx|src/features/settings/__tests__/settings.test.tsx',
  'src/features/test/TestPage.test.tsx|src/features/test/__tests__/TestPage.test.tsx',
  'src/features/test/questionnaire.integration.test.ts|src/features/test/__tests__/questionnaire.integration.test.ts',
  'src/i18n/t.test.ts|src/i18n/__tests__/t.test.ts',
  'src/lib/ai/HttpLabelReader.test.ts|src/lib/ai/__tests__/HttpLabelReader.test.ts',
  'src/lib/clock.test.ts|src/lib/__tests__/clock.test.ts',
  'src/lib/download.test.ts|src/lib/__tests__/download.test.ts',
  'src/lib/env.test.ts|src/lib/__tests__/env.test.ts',
  'src/lib/exportImport/exportImport.test.ts|src/lib/exportImport/__tests__/exportImport.test.ts',
  'src/lib/idb/photoStore.test.ts|src/lib/idb/__tests__/photoStore.test.ts',
  'src/lib/ids.test.ts|src/lib/__tests__/ids.test.ts',
  'src/lib/image/resizeImage.test.ts|src/lib/image/__tests__/resizeImage.test.ts',
  'src/lib/logger.test.ts|src/lib/__tests__/logger.test.ts',
  'src/lib/pwa/updateNotifier.test.ts|src/lib/pwa/__tests__/updateNotifier.test.ts',
  'src/lib/result.test.ts|src/lib/__tests__/result.test.ts',
  'src/lib/services/ServicesContext.test.tsx|src/lib/services/__tests__/ServicesContext.test.tsx',
  'src/lib/storage/storage.test.ts|src/lib/storage/__tests__/storage.test.ts',
  'src/logic/analyze/analyzeProduct.test.ts|src/logic/analyze/__tests__/analyzeProduct.test.ts',
  'src/logic/analyze/composition.test.ts|src/logic/analyze/__tests__/composition.test.ts',
  'src/logic/analyze/editComposition.test.ts|src/logic/analyze/__tests__/editComposition.test.ts',
  'src/logic/compare/compareProducts.test.ts|src/logic/compare/__tests__/compareProducts.test.ts',
  'src/logic/compat/checkList.test.ts|src/logic/compat/__tests__/checkList.test.ts',
  'src/logic/compat/checkPair.test.ts|src/logic/compat/__tests__/checkPair.test.ts',
  'src/logic/config.test.ts|src/logic/__tests__/config.test.ts',
  'src/logic/inci/compositions.test.ts|src/logic/inci/__tests__/compositions.test.ts',
  'src/logic/inci/coverage.test.ts|src/logic/inci/__tests__/coverage.test.ts',
  'src/logic/inci/levenshtein.test.ts|src/logic/inci/__tests__/levenshtein.test.ts',
  'src/logic/inci/normalizeIngredients.test.ts|src/logic/inci/__tests__/normalizeIngredients.test.ts',
  'src/logic/inci/parseInci.test.ts|src/logic/inci/__tests__/parseInci.test.ts',
  'src/logic/inci/searchIngredients.test.ts|src/logic/inci/__tests__/searchIngredients.test.ts',
  'src/logic/journal/calendar.test.ts|src/logic/journal/__tests__/calendar.test.ts',
  'src/logic/journal/journal.test.ts|src/logic/journal/__tests__/journal.test.ts',
  'src/logic/profile/buildProfile.test.ts|src/logic/profile/__tests__/buildProfile.test.ts',
  'src/logic/profile/invariants.test.ts|src/logic/profile/__tests__/invariants.test.ts',
  'src/logic/routine/analyzeRoutine.test.ts|src/logic/routine/__tests__/analyzeRoutine.test.ts',
  'src/logic/routine/attachProduct.test.ts|src/logic/routine/__tests__/attachProduct.test.ts',
  'src/logic/routine/edit.test.ts|src/logic/routine/__tests__/edit.test.ts',
  'src/logic/routine/routine.test.ts|src/logic/routine/__tests__/routine.test.ts',
  'src/logic/safety/evaluateSafety.test.ts|src/logic/safety/__tests__/evaluateSafety.test.ts',
  'src/logic/test/selection.test.ts|src/logic/test/__tests__/selection.test.ts',
  'src/logic/test/validate.test.ts|src/logic/test/__tests__/validate.test.ts',
  'src/logic/test/visibility.test.ts|src/logic/test/__tests__/visibility.test.ts',
  'src/schemas/schemas.test.ts|src/schemas/__tests__/schemas.test.ts',
  'src/store/createAppStore.test.ts|src/store/__tests__/createAppStore.test.ts',
  'src/store/migrations/migrations.test.ts|src/store/migrations/__tests__/migrations.test.ts',
  'src/styles/tokens.test.ts|src/styles/__tests__/tokens.test.ts',
  'src/test/TestProviders.tsx|src/test/helpers/TestProviders.tsx',
  'src/test/appHarness.tsx|src/test/helpers/appHarness.tsx',
  'src/test/deployConfig.test.ts|src/test/__tests__/deployConfig.test.ts',
  'src/test/fakes.ts|src/test/helpers/fakes.ts',
  'src/test/inciFixtures.ts|src/test/data/inciFixtures.ts',
  'src/test/normalizeParity.test.ts|src/test/__tests__/normalizeParity.test.ts',
  'src/test/personas.ts|src/test/data/personas.ts',
  'src/test/referenceContent.ts|src/test/data/referenceContent.ts',
  'src/test/routineContent.ts|src/test/data/routineContent.ts',
  'src/test/security.test.tsx|src/test/__tests__/security.test.tsx',
  'src/ui/ui.test.tsx|src/ui/__tests__/ui.test.tsx'
)

Write-Host "`n== 1. New files are in place =="
$missing = @()
foreach ($pair in $moved) {
  $parts = $pair -split '\|'
  if (-not (Test-Path -LiteralPath $parts[1])) { $missing += $parts[1] }
}
if ($missing.Count -gt 0) {
  $missing | ForEach-Object { Write-Host "  missing: $_" -ForegroundColor Red }
  Write-Host "`nNot every new file arrived, nothing was deleted. Send this output to Claude." -ForegroundColor Red
  exit 1
}
$summary += "OK   all $($moved.Count) files are at their new place"

Write-Host "`n== 2. Remove the old copies =="
$removed = 0
foreach ($pair in $moved) {
  $old = ($pair -split '\|')[0]
  if (Test-Path -LiteralPath $old) { Remove-Item -LiteralPath $old -Force; $removed++ }
}
Write-Host "  removed: $removed"
$emptyDirs = @(Get-ChildItem 'src', 'api', 'docs', 'scripts' -Directory -Recurse |
  Sort-Object { $_.FullName.Length } -Descending |
  Where-Object { @(Get-ChildItem -LiteralPath $_.FullName -Force).Count -eq 0 })
$emptyDirs | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
Write-Host "  empty folders removed: $($emptyDirs.Count)"
$summary += "OK   old copies removed ($removed)"

# .github cannot be written by Claude's tools: the one path in the PR template is fixed here.
$prTemplate = '.github\pull_request_template.md'
if (Test-Path -LiteralPath $prTemplate) {
  $text = [IO.File]::ReadAllText((Resolve-Path $prTemplate), [Text.Encoding]::UTF8)
  $fixed = $text.Replace('`docs/decisions.md`', '`docs/architecture/decisions.md`')
  if ($fixed -ne $text) { [IO.File]::WriteAllText((Resolve-Path $prTemplate), $fixed, (New-Object Text.UTF8Encoding($false))); Write-Host "  PR template: path to decisions.md updated" }
}

Write-Host "`n== 3. prettier --write =="
npx prettier --write . | Out-Null

Write-Host "`n== 4. npm run check =="
npm run check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run check' } else { $summary += 'FAIL npm run check' }

Write-Host "`n== 5. Content tables match the content files =="
npm run content:import -- --check
if ($LASTEXITCODE -eq 0) { $summary += 'OK   npm run content:import -- --check' } else { $summary += 'FAIL npm run content:import -- --check' }

Write-Host "`n== 6. Nothing mixed is left =="
$loose = @(Get-ChildItem 'src', 'api' -Recurse -File | Where-Object { $_.Name -match '\.test\.tsx?$' -and $_.FullName -notmatch '[\\/]__tests__[\\/]' })
$loose | ForEach-Object { Write-Host "  test outside __tests__: $($_.FullName)" -ForegroundColor Red }
$looseJson = @(Get-ChildItem 'src\content' -File -Filter *.json)
$looseJson | ForEach-Object { Write-Host "  json outside src\content\data: $($_.FullName)" -ForegroundColor Red }
$looseDocs = @(Get-ChildItem 'docs' -File | Where-Object { $_.Name -ne 'README.md' })
$looseDocs | ForEach-Object { Write-Host "  document outside a docs subfolder: $($_.FullName)" -ForegroundColor Red }
if (($loose.Count + $looseJson.Count + $looseDocs.Count) -eq 0) { $summary += 'OK   no mixed folders' } else { $summary += 'FAIL mixed files are left' }

Write-Host "`n== git status (short) =="
git add -A --dry-run | Select-Object -First 15
Write-Host "  ..."

Write-Host "`n== SUMMARY =="
$summary | ForEach-Object { if ($_ -like 'OK*') { Write-Host $_ -ForegroundColor Green } else { Write-Host $_ -ForegroundColor Red } }
if (($summary | Where-Object { $_ -like 'FAIL*' }).Count -eq 0) { Write-Host "`nAll good. Send this output to Claude." -ForegroundColor Green } else { Write-Host "`nSomething failed (see above). Send the full output to Claude." -ForegroundColor Red }
