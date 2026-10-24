[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$urls = @(
  'https://o-go-go.com/ru/zaporozhskaja/berdjansk/pamjatnik-santehniku-mishe',
  'https://kp.ua/zp/439445-v-berdianske-ukraly-pamiatnyk-osetru',
  'http://ilf-petrov.ru/news/item/f00/s00/n0000033/index.shtml'
)
$i = 0
foreach ($u in $urls) {
  $i++
  try {
    $wc = New-Object System.Net.WebClient
    $wc.Headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    $wc.Encoding = [Text.Encoding]::UTF8
    $html = $wc.DownloadString($u)
    $text = $html -replace '(?s)<script.*?</script>','' -replace '(?s)<style.*?</style>','' -replace '<[^>]+>',' ' -replace '\s+',' '
    [IO.File]::WriteAllText("C:\Users\J\source\memory\memorial-site\scripts\enrich\page_$i.txt", $text, (New-Object Text.UTF8Encoding $true))
    Write-Output "OK $u ($($text.Length) chars)"
  } catch {
    Write-Output "ERR $u : $($_.Exception.Message)"
  }
}
