Add-Type -AssemblyName System.Drawing
function New-Icon([int]$size, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $s = $size / 512.0
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#FFF3DD'))
  $red = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#E8493F'))
  $dark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#3A3A38'))
  $hub = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#B9B6AD'))
  $white = [System.Drawing.Brushes]::White
  $cream = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#FDF3F1'))
  $pupil = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#2C2C2A'))
  $g.FillEllipse($red, 130 * $s, 120 * $s, 250 * $s, 160 * $s)
  $g.FillRectangle($red, 60 * $s, 230 * $s, 392 * $s, 110 * $s)
  $g.FillEllipse($cream, 170 * $s, 150 * $s, 170 * $s, 90 * $s)
  $g.FillEllipse($white, 195 * $s, 165 * $s, 55 * $s, 55 * $s)
  $g.FillEllipse($white, 265 * $s, 165 * $s, 55 * $s, 55 * $s)
  $g.FillEllipse($pupil, 215 * $s, 182 * $s, 24 * $s, 24 * $s)
  $g.FillEllipse($pupil, 285 * $s, 182 * $s, 24 * $s, 24 * $s)
  $g.FillEllipse($dark, 100 * $s, 300 * $s, 100 * $s, 100 * $s)
  $g.FillEllipse($dark, 310 * $s, 300 * $s, 100 * $s, 100 * $s)
  $g.FillEllipse($hub, 130 * $s, 330 * $s, 40 * $s, 40 * $s)
  $g.FillEllipse($hub, 340 * $s, 330 * $s, 40 * $s, 40 * $s)
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}
New-Item -ItemType Directory -Force "icons" | Out-Null
New-Icon 512 "icons\icon-512.png"
New-Icon 180 "icons\icon-180.png"
Write-Output "icons done"
