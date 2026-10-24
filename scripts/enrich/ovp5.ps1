$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
$lines = [IO.File]::ReadAllLines((Join-Path $base 'ov_queries.txt'), [Text.Encoding]::UTF8)
foreach ($line in $lines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $idx = $line.IndexOf('|')
  $name = $line.Substring(0, $idx)
  $query = $line.Substring($idx + 1)
  $body = 'data=' + [uri]::EscapeDataString($query)
  try {
    $r = Invoke-WebRequest -Uri 'https://overpass.osm.ch/api/interpreter' -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded; charset=UTF-8' -TimeoutSec 120 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($name + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($name + ' OK len=' + $r.Content.Length)
  } catch {
    $resp = $_.Exception.Response; $body=''
    if ($resp -ne $null) { try { $sr = New-Object IO.StreamReader($resp.GetResponseStream()); $body = $sr.ReadToEnd() } catch {} }
    Write-Output ($name + ' ERR ' + $_.Exception.Message + ' ' + $body)
  }
  Start-Sleep -Seconds 2
}
