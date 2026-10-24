$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
function Esc($s) { [uri]::EscapeDataString($s) }

$urls = [ordered]@{
  mem_ener = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Monuments and memorials in Enerhodar') + '&cmlimit=50&format=json&formatversion=2'
  cul_hen  = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Culture of Henichesk') + '&cmlimit=50&format=json&formatversion=2'
  bld_hen  = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Buildings in Henichesk') + '&cmlimit=50&format=json&formatversion=2'
}
foreach ($k in $urls.Keys) {
  try {
    $r = Invoke-WebRequest -Uri $urls[$k] -TimeoutSec 60 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($k + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($k + ' OK len=' + $r.Content.Length)
  } catch { Write-Output ($k + ' ERR ' + $_.Exception.Message) }
  Start-Sleep -Milliseconds 600
}
