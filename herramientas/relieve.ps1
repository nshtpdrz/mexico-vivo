# Genera data/relieve/<id>.json con la elevación real alrededor de un volcán.
# Fuente: Terrain Tiles (formato Terrarium) del Registro de Datos Abiertos de AWS,
# que combina SRTM, GMTED y otros modelos digitales de elevación.
#   elevación (m) = R * 256 + G + B / 256 - 32768
# Uso: powershell -File herramientas\relieve.ps1 -Id orizaba -Lat 19.03 -Lon -97.27 -Medio 0.13 -N 61
param([string]$Id, [double]$Lat, [double]$Lon, [double]$Medio, [int]$N = 61, [int]$Zoom = 12)
Add-Type -AssemblyName System.Drawing
$raiz = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$cache = Join-Path $env:TEMP 'mexico-vivo-tiles'
New-Item -ItemType Directory -Force $cache | Out-Null

function TileXY([double]$la, [double]$lo, [int]$z) {
  $n = [math]::Pow(2, $z)
  $x = ($lo + 180) / 360 * $n
  $r = $la * [math]::PI / 180
  $y = (1 - [math]::Log([math]::Tan($r) + 1 / [math]::Cos($r)) / [math]::PI) / 2 * $n
  return @($x, $y)
}

$cosLat = [math]::Cos($Lat * [math]::PI / 180)
$lat0 = $Lat - $Medio; $lat1 = $Lat + $Medio
$lon0 = $Lon - $Medio / $cosLat; $lon1 = $Lon + $Medio / $cosLat
$bitmaps = @{}
function Pixel([double]$tx, [double]$ty) {
  $ix = [math]::Floor($tx); $iy = [math]::Floor($ty)
  $clave = "$Zoom-$ix-$iy"
  if (-not $bitmaps.ContainsKey($clave)) {
    $f = Join-Path $cache "$clave.png"
    if (-not (Test-Path $f)) {
      Invoke-WebRequest -UseBasicParsing -Uri "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/$Zoom/$ix/$iy.png" -OutFile $f
    }
    $bitmaps[$clave] = New-Object System.Drawing.Bitmap $f
  }
  $bmp = $bitmaps[$clave]
  $px = [math]::Min(255, [math]::Floor(($tx - $ix) * 256)); $py = [math]::Min(255, [math]::Floor(($ty - $iy) * 256))
  $c = $bmp.GetPixel($px, $py)
  return $c.R * 256 + $c.G + $c.B / 256 - 32768
}

$z = New-Object System.Collections.Generic.List[int]
for ($i = 0; $i -lt $N; $i++) {
  $la = $lat1 - ($lat1 - $lat0) * $i / ($N - 1)
  for ($j = 0; $j -lt $N; $j++) {
    $lo = $lon0 + ($lon1 - $lon0) * $j / ($N - 1)
    $t = TileXY $la $lo $Zoom
    $z.Add([int][math]::Round((Pixel $t[0] $t[1])))
  }
}
$bitmaps.Values | ForEach-Object { $_.Dispose() }
$inv = [Globalization.CultureInfo]::InvariantCulture
$f = { param($v) $v.ToString('0.#####', $inv) }
$json = '{"id":"' + $Id + '","n":' + $N + ',"lat0":' + (& $f $lat0) + ',"lat1":' + (& $f $lat1) + ',"lon0":' + (& $f $lon0) + ',"lon1":' + (& $f $lon1) +
  ',"fuente":"Terrain Tiles (Mapzen/Tilezen) del Registro de Datos Abiertos de AWS: SRTM, GMTED y otros","z":[' + ($z -join ',') + ']}'
$dest = Join-Path $raiz "data\relieve\$Id.json"
[IO.File]::WriteAllText($dest, $json)
"$Id listo: $($z.Count) puntos, máximo $(($z | Measure-Object -Maximum).Maximum) m"
