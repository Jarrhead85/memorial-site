[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
$urls = @(
  'https://rest.guru.ua/melitopol/places/2005-pamyatnik_ostapu_benderu',
  'https://mltpl.city/articles/19246/skvernaya-istoriya-ostap-bender-dezorientirovan-huliganami-kto-pomozhet-pamyatniku',
  'https://o-go-go.com/ru/zaporozhskaja/berdjansk/pamjatnik-santehniku-mishe',
  'https://berdyansk.org.ua/gorod/pamyatnik-osetru-i2048',
  'https://misto.zp.ua/article/partners/2500-letniy-pamyatnik-v-energodare-godami-ukrashaet-kurilku_8395.html',
  'https://1news.zp.ua/ru/v-energodari-odin-z-simvoliv-mista-perenesli-na-nove-miscze/'
)
$i = 10
foreach ($u in $urls) {
  $i++
  try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    $wc.Encoding = [Text.Encoding]::UTF8
    $html = $wc.DownloadString($u)
    $text = $html -replace '(?s)<script.*?</script>','' -replace '(?s)<style.*?</style>','' -replace '<[^>]+>',' ' -replace '\s+',' '
    [IO.File]::WriteAllText("C:\Users\J\source\memory\memorial-site\scripts\enrich\page_$i.txt", $text, (New-Object Text.UTF8Encoding $true))
    Write-Output "OK $u ($($text.Length))"
  } catch {
    Write-Output "ERR $u :: $($_.Exception.Message)"
  }
  Start-Sleep -Milliseconds 500
}
