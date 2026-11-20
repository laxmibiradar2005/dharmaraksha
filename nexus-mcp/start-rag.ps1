$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath 'dist/scripts/serve-rag.js')) {
 npm run build
 if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
}
Write-Host 'Starting laptop RAG. Keep this window open while using UNO Q.'
node dist/scripts/serve-rag.js
