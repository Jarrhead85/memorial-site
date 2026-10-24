$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
function Esc($s) { [uri]::EscapeDataString($s) }

$urls = [ordered]@{
  cat_plumber = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Monument to plumber, Berdiansk') + '&cmtype=file&cmlimit=20&format=json&formatversion=2'
  cat_goby    = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Monument to Goby the Breadwinner, Berdiansk') + '&cmtype=file&cmlimit=20&format=json&formatversion=2'
  sub_berd    = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Berdyansk') + '&cmtype=subcat&cmlimit=50&format=json&formatversion=2'
  sub_hen     = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Henichesk') + '&cmtype=subcat&cmlimit=50&format=json&formatversion=2'
  sub_ener    = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=' + (Esc 'Category:Enerhodar') + '&cmtype=subcat&cmlimit=50&format=json&formatversion=2'
}
foreach ($k in $urls.Keys) {
  try {
    $r = Invoke-WebRequest -Uri $urls[$k] -TimeoutSec 60 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($k + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($k + ' OK len=' + $r.Content.Length)
  } catch { Write-Output ($k + ' ERR ' + $_.Exception.Message) }
  Start-Sleep -Milliseconds 600
}
