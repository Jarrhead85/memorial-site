$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
$q = '[out:json][timeout:60];(node["historic"~"^(memorial|monument)$"]({0});node["tourism"="artwork"]({0});way["historic"~"^(memorial|monument)$"]({0});way["tourism"="artwork"]({0}););out center tags;'
$boxes = [ordered]@{
  berd  = '(46.715,36.735,46.785,36.850)'
  melit = '(46.820,35.310,46.880,35.420)'
  gen   = '(46.150,34.780,46.200,34.840)'
  ener  = '(48.455,35.150,48.500,35.230)'
}
foreach ($k in $boxes.Keys) {
  $query = $q.Replace('{0}', $boxes[$k])
  try {
    $r = Invoke-WebRequest -Uri 'https://overpass.osm.ch/api/interpreter' -Method Post -Body @{data=$query} -TimeoutSec 120 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ('tmp_' + $k + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($k + ' OK len=' + $r.Content.Length)
  } catch {
    Write-Output ($k + ' ERR ' + $_.Exception.Message)
  }
  Start-Sleep -Seconds 2
}
