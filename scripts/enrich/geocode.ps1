[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$queries = @(
  'Мелитополь, проспект 50-летия Победы 33',
  'Мелитополь, проспект 50-летия Победы 19',
  'Бердянск, Тенистый бульвар',
  'Бердянск, Приморская площадь',
  'Мелитополь, проспект Богдана Хмельницкого',
  'Мелитополь, улица Вакуленчука 99'
)
foreach ($q in $queries) {
  $enc = $q -replace ' ', '%20'
  $url = "https://nominatim.openstreetmap.org/search?q=$enc&format=jsonv2&limit=3"
  foreach ($try in 1..3) {
    try {
      $r = Invoke-RestMethod -Uri $url -UserAgent 'memorial-hunter/1.0' -TimeoutSec 30
      Write-Output "QUERY: $q"
      foreach ($item in $r) {
        Write-Output ("  " + $item.lat + " " + $item.lon + " | " + $item.type + " | " + $item.display_name)
      }
      break
    } catch {
      Write-Output ("  try" + $try + " ERROR: " + $_.Exception.Message)
      Start-Sleep -Seconds 2
    }
  }
  Start-Sleep -Milliseconds 1200
}
