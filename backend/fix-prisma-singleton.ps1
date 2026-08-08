# fix-prisma-singleton.ps1
# ⭐ Ranplase 'const prisma = new PrismaClient()' pa yon require() sou singleton
#    pataje a (src/config/prisma.js) nan tout fichye ki rete yo.
# Kouri li apati backend/ (kote src/ ye a):
#   cd backend
#   .\fix-prisma-singleton.ps1

$root = "src"

# Fichye ki nan src\routes\ — 2 nivo desann pou rive nan src\config\prisma.js
$filesRoutes = @(
  "routes\admin-finances.routes.js",
  "routes\mikwo-expenses.routes.js",
  "routes\mikwo-profit.routes.js",
  "routes\pg-employees.routes.js",
  "routes\pg-expenses.routes.js",
  "routes\pre.routes.js",
  "routes\sol.routes.js"
)

# Fichye ki nan src\modules\<dosye>\ — 3 nivo desann
$filesModules = @(
  "modules\internet\internet.controller.js",
  "modules\internet\internet.routes.js",
  "modules\kane-epay\kane-epay.controller.js",
  "modules\kane-epay\kane-epay.service.js",
  "modules\notifications\notification.service.js",
  "modules\sabotay\position-ranking.service.js",
  "modules\sabotay\sabotay.routes.js",
  "modules\sabotay\sabotay.service.js"
)

function Fix-PrismaFile {
  param($RelPath, $RequirePath)

  $full = Join-Path $root $RelPath
  if (-not (Test-Path $full)) {
    Write-Warning "Pa jwenn fichye a: $full"
    return
  }

  $content  = Get-Content $full -Raw
  $original = $content

  # Retire liy "const { PrismaClient } = require('@prisma/client')"
  $content = $content -replace "(?m)^\s*const\s*\{\s*PrismaClient\s*\}\s*=\s*require\(\s*['""]@prisma/client['""]\s*\)\s*;?\s*\r?\n", ""

  # Ranplase "const prisma = new PrismaClient(...)" ak require() singleton an
  # ⭐ [ \t]* (pa \s*) anvan pwen vigil la — evite manje newline ki vin apre a
  #    lè pa gen pwen vigil, sa ki t ap fè liy k ap vini apre a kole sou menm liy la
  $content = $content -replace "const\s+prisma\s*=\s*new\s+PrismaClient\([^)]*\)[ \t]*;?", "const prisma = require('$RequirePath')"

  if ($content -ne $original) {
    Set-Content -Path $full -Value $content -NoNewline
    Write-Host "OK korije: $RelPath"
  } else {
    Write-Warning "Pa gen chanjman otomatik pou: $RelPath -- verifye li manyèlman (fòma diferan?)"
  }
}

Write-Host "== Fichye nan src\routes\ =="
foreach ($f in $filesRoutes) { Fix-PrismaFile -RelPath $f -RequirePath "../config/prisma" }

Write-Host "`n== Fichye nan src\modules\... =="
foreach ($f in $filesModules) { Fix-PrismaFile -RelPath $f -RequirePath "../../config/prisma" }

Write-Host "`nFini. Kounye a kouri 'git diff' pou verifye chak chanjman anvan w commit."
