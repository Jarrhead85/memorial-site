$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
$lines = [IO.File]::ReadAllLines((Join-Path $base 'ov_queries.txt'), [Text.Encoding]::UTF8)
foreach ($line in $lines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $idx = $line.IndexOf('|')
  $name = $line.Substring(0, $idx)
  $query = $line.Substring($idx + 1)
  $done = $false
  for ($attempt = 1; $attempt -le 4; $attempt++) {
    $nonce = '// q' + [guid]::NewGuid().ToString('N') + "`n"
    $body = 'data=' + [uri]::EscapeDataString($nonce + $query)
    try {
      $r = Invoke-WebRequest -Uri 'https://overpass.osm.ch/api/interpreter' -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded; charset=UTF-8' -TimeoutSec 120 -UseBasicParsing
      $c = $r.Content
      if ($c -like '*duplicate_query*' -or $c -like '*runtime error*') {
        Write-Output ($name + ' attempt ' + $attempt + ' server error, retrying')
        Start-Sleep -Seconds (4 * $attempt)
        continue
      }
      [IO.File]::WriteAllText((Join-Path $base ($name + '.json')), $c, [Text.Encoding]::UTF8)
      Write-Output ($name + ' OK len=' + $c.Length)
      $done = $true
      break
    } catch {
      Write-Output ($name + ' attempt ' + $attempt + ' ERR ' + $_.Exception.Message)
      Start-Sleep -Seconds (4 * $attempt)
    }
  }
  if (-not $done) { Write-Output ($name + ' FAILED') }
  Start-Sleep -Seconds 3
}
