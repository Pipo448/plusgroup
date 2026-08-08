# fix-merged-lines.ps1
# ⭐ Ranje fichye kote "require('.../config/prisma')" te kole dirèk ak kòd ki vin
#    apre l san saut liy (paske ansyen skript la te manje newline lan pa erè).
#    Sekirize: li pa touche fichye ki DEJA byen separe ak yon saut liy.
# Kouri li apati backend/:
#   powershell -ExecutionPolicy Bypass -File .\fix-merged-lines.ps1

$root = "src"

$allFiles = @(
  "routes\admin-finances.routes.js",
  "routes\mikwo-expenses.routes.js",
  "routes\mikwo-profit.routes.js",
  "routes\pg-employees.routes.js",
  "routes\pg-expenses.routes.js",
  "routes\pre.routes.js",
  "routes\sol.routes.js",
  "routes\klinik.routes.js",
  "modules\internet\internet.controller.js",
  "modules\internet\internet.routes.js",
  "modules\kane-epay\kane-epay.controller.js",
  "modules\kane-epay\kane-epay.service.js",
  "modules\notifications\notification.service.js",
  "modules\sabotay\position-ranking.service.js",
  "modules\sabotay\sabotay.routes.js",
  "modules\sabotay\sabotay.service.js"
)

foreach ($rel in $allFiles) {
  $full = Join-Path $root $rel
  if (-not (Test-Path $full)) {
    Write-Warning "Pa jwenn: $full"
    continue
  }

  $content  = Get-Content $full -Raw
  $original = $content

  # Si require('.../config/prisma') swiv dirèk pa yon lèt/underscore (san saut liy
  # ant yo), ensere yon saut liy la. Lè yo DEJA byen separe, lookahead la pa matche
  # anyen paske pwochen karaktè a se \r oswa \n, pa yon lèt — donk san danje.
  $content = $content -replace "(require\('(?:\.\./)+config/prisma'\))(?=[A-Za-z_])", "`$1`r`n"

  if ($content -ne $original) {
    Set-Content -Path $full -Value $content -NoNewline
    Write-Host "OK ranje liy kole: $rel"
  } else {
    Write-Host "Anyen pou ranje (deja bon): $rel"
  }
}

Write-Host "`nFini. Kouri 'git diff' pou verifye, epi 'npm start' pou konfime."
