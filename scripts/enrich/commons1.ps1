$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'

function Esc($s) { [uri]::EscapeDataString($s) }

$titles = @(
  "File:Monument to Michael Thonet's chair in Melitopol (Zaporizhia Oblast, Ukraine).JPG",
  'File:Statue of mechanician in Melitopol (Zaporizhia Oblast, Ukraine).JPG',
  'File:Bogdana Hmelnitskogo Ave., Melitopol, Zaporizhia Oblast, 16.jpg',
  'File:Sculpture in Gorky Park (Melitopol).JPG'
)
$titlesParam = ($titles -join '|')

$urls = [ordered]@{
  files_melit = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + (Esc $titlesParam) + '&prop=imageinfo&iiprop=url%7Cextmetadata&format=json&formatversion=2'
  s1 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Berdiansk monument') + '&srnamespace=6&srlimit=20&format=json&formatversion=2'
  s2 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Berdyansk pamyatnik') + '&srnamespace=6&srlimit=20&format=json&formatversion=2'
  s3 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Berdiansk bullhead') + '&srnamespace=6&srlimit=10&format=json&formatversion=2'
  s4 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Berdiansk Bender Balaganov') + '&srnamespace=6&srlimit=10&format=json&formatversion=2'
  s5 = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=' + (Esc 'Melitopol monument') + '&srnamespace=6&srlimit=20&format=json&formatversion=2'
}
foreach ($k in $urls.Keys) {
  try {
    $r = Invoke-WebRequest -Uri $urls[$k] -TimeoutSec 60 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($k + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($k + ' OK len=' + $r.Content.Length)
  } catch { Write-Output ($k + ' ERR ' + $_.Exception.Message) }
  Start-Sleep -Milliseconds 800
}
