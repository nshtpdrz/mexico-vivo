# Servidor local mínimo para México Vivo (sin instalar nada).
# Uso:  powershell -ExecutionPolicy Bypass -File servidor.ps1
# Luego abre http://localhost:8080 (la cámara funciona en localhost).
param([int]$Puerto = 8080)

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'
  '.svg' = 'image/svg+xml'; '.mind' = 'application/octet-stream'; '.ico' = 'image/x-icon'; '.md' = 'text/plain; charset=utf-8'
}
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Puerto/")
$l.Start()
Write-Host "México Vivo listo en http://localhost:$Puerto  (Ctrl+C para detener)"
try {
  while ($l.IsListening) {
    $ctx = $l.GetContext()
    $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($ruta -eq '') { $ruta = 'index.html' }
    $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
    $res = $ctx.Response
    if ($archivo.StartsWith($raiz) -and (Test-Path $archivo -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($archivo).ToLower()
      $res.ContentType = if ($tipos[$ext]) { $tipos[$ext] } else { 'application/octet-stream' }
      $res.Headers.Add('Cache-Control', 'no-cache')
      $bytes = [IO.File]::ReadAllBytes($archivo)
      $res.ContentLength64 = $bytes.Length
      if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
    } else {
      $res.StatusCode = 404
    }
    $res.Close()
  }
} finally { $l.Stop() }
