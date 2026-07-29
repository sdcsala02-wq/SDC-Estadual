$ErrorActionPreference = "Stop"

$destino = Join-Path $PSScriptRoot "backend\public\data\distritos-sao-paulo.geojson"
$pasta = Split-Path $destino -Parent

if (-not (Test-Path $pasta)) {
    New-Item -ItemType Directory -Path $pasta -Force | Out-Null
}

$url = "https://gist.githubusercontent.com/pedro-valentim/492e20d78f57a92be3a032a34af01d40/raw/103e02b8d8bd4de0864a7c15949da3b9346b94a0/saopaulo_distritos_poligonos.geojson"

Write-Host "Baixando o mapa dos distritos de São Paulo..."
Invoke-WebRequest -Uri $url -OutFile $destino -UseBasicParsing

try {
    $conteudo = Get-Content $destino -Raw -Encoding UTF8 | ConvertFrom-Json
} catch {
    Remove-Item $destino -Force -ErrorAction SilentlyContinue
    throw "O arquivo baixado não é um JSON válido."
}

if ($conteudo.type -ne "FeatureCollection") {
    Remove-Item $destino -Force -ErrorAction SilentlyContinue
    throw "O arquivo baixado não é um GeoJSON FeatureCollection válido."
}

$total = @($conteudo.features).Count

Write-Host ""
Write-Host "Arquivo criado com sucesso:" -ForegroundColor Green
Write-Host $destino
Write-Host "Regiões encontradas: $total"
Write-Host ""
Write-Host "Agora atualize a página com Ctrl + F5."
