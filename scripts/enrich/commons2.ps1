$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
function Esc($s) { [uri]::EscapeDataString($s) }

$urls = [ordered]@{
  files2 = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + (Esc 'File:Monument Goby the feeder.jpg|File:Monument plumbing.JPG') + '&prop=imageinfo&iiprop=url%7Cextmetadata&format=json&formatversion=2'
  s6 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Ostap Bender Berdiansk sculpture') + '&srnamespace=6&srlimit=10&format=json&formatversion=2'
  s7 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Berdiansk Schmidt park children') + '&srnamespace=6&srlimit=10&format=json&formatversion=2'
  s8 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'incategory:"Berdyansk" sculpture') + '&srnamespace=6&srlimit=20&format=json&formatversion=2'
  s9 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Genichesk') + '&srnamespace=14&srlimit=10&format=json&formatversion=2'
  s10 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Energodar') + '&srnamespace=14&srlimit=10&format=json&formatversion=2'
  s11 = 'https://ru.wikipedia.org/w/api.php?action=query&titles=' + (Esc 'File:Bogdana Hmelnitskogo Ave., Melitopol, Zaporizhia Oblast, 16.jpg') + '&prop=imageinfo&iiprop=url%7Cextmetadata&format=json&formatversion=2'
}
foreach ($k in $urls.Keys) {
  try {
    $r = Invoke-WebRequest -Uri $urls[$k] -TimeoutSec 60 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($k + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($k + ' OK len=' + $r.Content.Length)
  } catch { Write-Output ($k + ' ERR ' + $_.Exception.Message) }
  Start-Sleep -Milliseconds 700
}
