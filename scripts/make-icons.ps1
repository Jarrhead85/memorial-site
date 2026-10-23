# Иконки PWA: PowerShell + System.Drawing (без внешних зависимостей).
# Тёмный скруглённый квадрат, золотая метка-пин с чашей памятника.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$outDir = "C:\Users\J\source\memory\memorial-site\public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Draw-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  # фон: скруглённый квадрат
  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 10, 15))
  $r = [int]($size * 0.22)
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddArc(0, 0, 2*$r, 2*$r, 180, 90)
  $gp.AddArc($size - 2*$r, 0, 2*$r, 2*$r, 270, 90)
  $gp.AddArc($size - 2*$r, $size - 2*$r, 2*$r, 2*$r, 0, 90)
  $gp.AddArc(0, $size - 2*$r, 2*$r, 2*$r, 90, 90)
  $gp.CloseFigure()
  $g.FillPath($bg, $gp)

  # палитра
  $gold = [System.Drawing.Color]::FromArgb(255, 201, 168, 76)
  $goldLight = [System.Drawing.Color]::FromArgb(255, 240, 226, 182)
  $dark = [System.Drawing.Color]::FromArgb(255, 10, 10, 15)
  $penGold = New-Object System.Drawing.Pen($gold, [single]($size * 0.055))
  $penGold.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penGold.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $brushDark = New-Object System.Drawing.SolidBrush($dark)

  # метка-пин: круг + хвост-треугольник
  $cx = [single]($size / 2)
  $headR = [single]($size * 0.26)
  $headY = [single]($size * 0.38)
  $tailY = [single]($size * 0.86)

  $pin = New-Object System.Drawing.Drawing2D.GraphicsPath
  $pin.AddEllipse($cx - $headR, $headY - $headR, 2*$headR, 2*$headR)
  # треугольный хвост: из круга вниз к острию и обратно
  $leftX = [single]($cx - $headR * 0.72)
  $rightX = [single]($cx + $headR * 0.72)
  $leftY = [single]($headY + $headR * 0.62)
  $pin.AddLine($leftX, $leftY, $cx, $tailY)
  $pin.AddLine($cx, $tailY, $rightX, $leftY)
  $pin.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush($gold)), $pin)

  # чаша памятника внутри пина
  $bowlW = [single]($size * 0.22)
  $bowlY = [single]($headY)
  $g.FillEllipse($brushDark, ($cx - $bowlW/2), ($bowlY - $bowlW/2), $bowlW, ($bowlW*0.72))
  $stemY1 = [single]($headY + $bowlW*0.30)
  $stemY2 = [single]($headY + $bowlW*0.62)
  $g.DrawLine($penGold, $cx, $stemY1, $cx, $stemY2)
  $baseW = [single]($bowlW * 0.9)
  $baseY = [single]($stemY2 + $size*0.02)
  $g.DrawLine($penGold, ($cx - $baseW/2), $baseY, ($cx + $baseW/2), $baseY)

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "saved $path"
}

Draw-Icon 192 "$outDir\icon-192.png"
Draw-Icon 512 "$outDir\icon-512.png"
