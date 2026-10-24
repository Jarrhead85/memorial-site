$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'

function Try-OV($name, $query) {
  try {
    $r = Invoke-WebRequest -Uri 'https://overpass.osm.ch/api/interpreter' -Method Post -Body @{data=$query} -TimeoutSec 120 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($name + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($name + ' OK len=' + $r.Content.Length)
  } catch {
    $resp = $_.Exception.Response
    $body = ''
    if ($resp -ne $null) {
      try { $sr = New-Object IO.StreamReader($resp.GetResponseStream()); $body = $sr.ReadToEnd() } catch { $body = 'no body' }
    }
    Write-Output ($name + ' ERR ' + $_.Exception.Message + ' | BODY: ' + $body)
  }
  Start-Sleep -Seconds 1
}

Try-OV 'testA' '[out:json][timeout:60];node["tourism"="artwork"](46.750,36.790,46.752,36.792);out tags;'
Try-OV 'testB' '[out:json][timeout:60];node["historic"~"memorial"](46.750,36.790,46.752,36.792);out tags;'
