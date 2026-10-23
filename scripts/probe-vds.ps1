# Probe VDS 195.209.215.61: external HTTP/TCP checks only (read-only)
$ip = '195.209.215.61'
$ports = 22, 80, 443, 3000, 5000, 5173, 8000, 8080, 8081, 8443, 8765, 8888, 9000, 9090

Write-Output '=== TCP ports ==='
foreach ($p in $ports) {
  $r = Test-NetConnection -ComputerName $ip -Port $p -WarningAction SilentlyContinue
  if ($r.TcpTestSucceeded) { Write-Output ("port {0} OPEN" -f $p) } else { Write-Output ("port {0} closed" -f $p) }
}

Write-Output ''
Write-Output '=== HTTP probes ==='
$targets = @('http://195.209.215.61/', 'http://195.209.215.61:3000/', 'http://195.209.215.61:8080/', 'http://195.209.215.61:8081/', 'http://195.209.215.61:8765/', 'http://195.209.215.61:9000/', 'https://195.209.215.61/')
foreach ($u in $targets) {
  try {
    $resp = Invoke-WebRequest -Uri $u -TimeoutSec 6 -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    Write-Output ("{0} -> {1} | server: {2} | len: {3}" -f $u, $resp.StatusCode, $resp.Headers['Server'], $resp.RawContentLength)
  } catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    if ($code -gt 0) { Write-Output ("{0} -> HTTP {1}" -f $u, $code) }
    else { Write-Output ("{0} -> no response" -f $u) }
  }
}
