$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
function Esc($s) { [uri]::EscapeDataString($s) }
function C([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }

$skif = C @(0x0421,0x043A,0x0438,0x0444,0x0441,0x043A,0x0430,0x044F,0x0020,0x0431,0x0430,0x0431,0x0430,0x002E,0x0020,0x042D,0x043D,0x0435,0x0440,0x0433,0x043E,0x0434,0x0430,0x0440)
$zis  = C @(0x0417,0x0438,0x0421,0x002D,0x0033,0x002E,0x0020,0x042D,0x043D,0x0435,0x0440,0x0433,0x043E,0x0434,0x0430,0x0440)
$znak = C @(0x041F,0x0430,0x043C,0x044F,0x0442,0x043D,0x044B,0x0439,0x0020,0x0437,0x043D,0x0430,0x043A,0x0020,0x043D,0x0430,0x0020,0x0430,0x043B,0x043B,0x0435,0x0435,0x002E,0x0020,0x042D,0x043D,0x0435,0x0440,0x0433,0x043E,0x0434,0x0430,0x0440)

$titles = 'File:' + $skif + '.JPG|File:' + $zis + '.jpg|File:' + $znak + '.JPG'

$urls = [ordered]@{
  ener_files = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + (Esc $titles) + '&prop=imageinfo&iiprop=url%7Cextmetadata&format=json&formatversion=2'
  mem_hen = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Monuments and memorials in Henichesk') + '&cmlimit=50&format=json&formatversion=2'
}
foreach ($k in $urls.Keys) {
  try {
    $r = Invoke-WebRequest -Uri $urls[$k] -TimeoutSec 60 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($k + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($k + ' OK len=' + $r.Content.Length)
  } catch { Write-Output ($k + ' ERR ' + $_.Exception.Message) }
  Start-Sleep -Milliseconds 600
}
