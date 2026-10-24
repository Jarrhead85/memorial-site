$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = 'C:\Users\J\source\memory\memorial-site\scripts\enrich'
function Esc($s) { [uri]::EscapeDataString($s) }
# Cyrillic written via codepoints to avoid script encoding issues
$bychok = [char]0x0411 + [char]0x044B + [char]0x0447 + [char]0x043E + [char]0x043A + ' ' + [char]0x043A + [char]0x043E + [char]0x0440 + [char]0x043C + [char]0x0438 + [char]0x043B + [char]0x0435 + [char]0x0446
$benderMel = [char]0x041E + [char]0x0441 + [char]0x0442 + [char]0x0430 + [char]0x043F + ' ' + [char]0x0411 + [char]0x0435 + [char]0x043D + [char]0x0434 + [char]0x0435 + [char]0x0440 + ' ' + [char]0x041C + [char]0x0435 + [char]0x043B + [char]0x0438 + [char]0x0442 + [char]0x043E + [char]0x043F + [char]0x043E + [char]0x043B + [char]0x044C
$venChair = [char]0x0412 + [char]0x0435 + [char]0x043D + [char]0x0441 + [char]0x043A + [char]0x0438 + [char]0x0439 + ' ' + [char]0x0441 + [char]0x0442 + [char]0x0443 + [char]0x043B + ' ' + [char]0x041C + [char]0x0435 + [char]0x043B + [char]0x0438 + [char]0x0442 + [char]0x043E + [char]0x043F + [char]0x043E + [char]0x043B + [char]0x044C
$genicheskSkaz = [char]0x0413 + [char]0x0435 + [char]0x043D + [char]0x0438 + [char]0x0447 + [char]0x0435 + [char]0x0441 + [char]0x043A + ' ' + [char]0x0441 + [char]0x043A + [char]0x0430 + [char]0x0437 + [char]0x043A + [char]0x0430
$energodarBaba = [char]0x042D + [char]0x043D + [char]0x0435 + [char]0x0440 + [char]0x0433 + [char]0x043E + [char]0x0434 + [char]0x0430 + [char]0x0440 + ' ' + [char]0x0431 + [char]0x0430 + [char]0x0431 + [char]0x0430
$gribyGlaza = [char]0x0413 + [char]0x0440 + [char]0x0438 + [char]0x0431 + [char]0x044B + ' ' + [char]0x0441 + ' ' + [char]0x0433 + [char]0x043B + [char]0x0430 + [char]0x0437 + [char]0x0430 + [char]0x043C + [char]0x0438

$jobs = [ordered]@{
  uk_bychok      = @{ host = 'https://uk.wikipedia.org/w/api.php'; q = $bychok }
  uk_benderMel   = @{ host = 'https://uk.wikipedia.org/w/api.php'; q = $benderMel }
  uk_venChair    = @{ host = 'https://uk.wikipedia.org/w/api.php'; q = $venChair }
  uk_genichesk   = @{ host = 'https://uk.wikipedia.org/w/api.php'; q = $genicheskSkaz }
  uk_energodar   = @{ host = 'https://uk.wikipedia.org/w/api.php'; q = $energodarBaba }
  ru_griby       = @{ host = 'https://ru.wikipedia.org/w/api.php'; q = $gribyGlaza }
}
foreach ($k in $jobs.Keys) {
  $u = $jobs[$k].host + '?action=query&list=search&srsearch=' + (Esc $jobs[$k].q) + '&srlimit=8&format=json&formatversion=2'
  try {
    $r = Invoke-WebRequest -Uri $u -TimeoutSec 60 -UseBasicParsing
    [IO.File]::WriteAllText((Join-Path $base ($k + '.json')), $r.Content, [Text.Encoding]::UTF8)
    Write-Output ($k + ' OK len=' + $r.Content.Length)
  } catch { Write-Output ($k + ' ERR ' + $_.Exception.Message) }
  Start-Sleep -Milliseconds 700
}
