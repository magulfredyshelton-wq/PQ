param([Parameter(Mandatory = $true)][string]$Projecto)

$ErrorActionPreference = 'Stop'
$destino = (Resolve-Path -LiteralPath $Projecto).Path
if (-not (Test-Path -LiteralPath (Join-Path $destino 'backend\app') -PathType Container) -or
    -not (Test-Path -LiteralPath (Join-Path $destino 'frontend') -PathType Container)) {
    throw 'Indica a pasta do jogo que contém backend e frontend.'
}
$ficheiros = @(
    'backend\app\missao.py', 'backend\app\servico.py', 'backend\test_missao.py',
    'backend\app\equipamento.py', 'backend\test_equipamento.py',
    'frontend\lua.js', 'frontend\equipamento-3d.js', 'frontend\lua.test.js',
    'backend\app\superficie.py', 'backend\app\http.py', 'backend\test_superficie.py', 'GUIA_3D.md',
    'frontend\globo.js', 'frontend\terreno.js', 'frontend\terreno.test.js',
    'frontend\hangar.html', 'frontend\jogo.js', 'frontend\jogo-3d.css',
    'frontend\cena-3d.js', 'frontend\icones.js', 'frontend\conceitos.js',
    'frontend\mundo.js', 'frontend\missao.js', 'frontend\voz.js', 'frontend\chat.js',
    'frontend\vendor\three.module.js', 'frontend\vendor\three.core.js',
    'frontend\vendor\THREE-LICENSE.txt'
)
foreach ($ficheiro in $ficheiros) {
    $origem = Join-Path $PSScriptRoot $ficheiro
    if (-not (Test-Path -LiteralPath $origem -PathType Leaf)) { throw "Falta $ficheiro no pacote." }
}
foreach ($ficheiro in $ficheiros) {
    $origem = Join-Path $PSScriptRoot $ficheiro
    $alvo = Join-Path $destino $ficheiro
    New-Item -ItemType Directory -Path (Split-Path -Parent $alvo) -Force | Out-Null
    Copy-Item -LiteralPath $origem -Destination $alvo -Force
}
Write-Host 'Actualização instalada. Arranca o backend e recarrega a página do jogo.'
