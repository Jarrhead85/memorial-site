[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$q = '[out:json][timeout:80];(node["name"~"Бычок|сантех|Айболит|Грабл|Жаб|дачник",i](46.70,36.70,46.82,36.90);way["name"~"Бычок|сантех|Айболит|Грабл|Жаб|дачник",i](46.70,36.70,46.82,36.90););out center tags;'
$r = Invoke-WebRequest -Uri 'https://overpass-api.de/api/interpreter' -Method Post -Body @{ data = $q } -UseBasicParsing -TimeoutSec 100
$r.Content | Out-File -FilePath $env:TEMP\overpass_bdy.json -Encoding utf8
Write-Output ('OK ' + $r.Content.Length)
