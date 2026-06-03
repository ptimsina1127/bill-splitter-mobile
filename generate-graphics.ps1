Add-Type -AssemblyName System.Drawing

$assetsDir = "C:\Users\Pravat\Desktop\workspace\bill-splitter-mobile\assets\images"

# Maroon: #800000
$maroon = [System.Drawing.Color]::FromArgb(255,128,0,0)
$white = [System.Drawing.Color]::White
$lightMaroon = [System.Drawing.Color]::FromArgb(255,180,50,50)

function New-SolidBg {
  param($w, $h, $color)
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'HighQuality'
  $g.Clear($color)
  $g.Dispose()
  return $bmp
}

# === 1. APP ICON 1024x1024 ===
Write-Host "Generating app icon..."
$icon = New-SolidBg 1024 1024 $maroon
$g = [System.Drawing.Graphics]::FromImage($icon)
$g.SmoothingMode = 'HighQuality'
$g.TextRenderingHint = 'AntiAliasGridFit'

$font = New-Object System.Drawing.Font("Arial", 560, [System.Drawing.FontStyle]::Bold)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = 'Center'
$fmt.LineAlignment = 'Center'
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$g.DrawString("B", $font, $whiteBrush, 512, 490, $fmt)

$g.Dispose()
$icon.Save("$assetsDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "  -> icon.png"

# === 2. ADAPTIVE ICON 1024x1024 ===
Write-Host "Generating adaptive icon..."
$adaptive = New-Object System.Drawing.Bitmap(1024, 1024)
$g2 = [System.Drawing.Graphics]::FromImage($adaptive)
$g2.SmoothingMode = 'HighQuality'
$g2.TextRenderingHint = 'AntiAliasGridFit'

$font2 = New-Object System.Drawing.Font("Arial", 500, [System.Drawing.FontStyle]::Bold)
$maroonBrush = New-Object System.Drawing.SolidBrush($maroon)
$g2.DrawString("B", $font2, $maroonBrush, 512, 500, $fmt)

$g2.Dispose()
$adaptive.Save("$assetsDir\adaptive-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "  -> adaptive-icon.png"

# === 3. FEATURE GRAPHIC 1024x500 ===
Write-Host "Generating feature graphic..."
$fg = New-Object System.Drawing.Bitmap(1024, 500)
$g3 = [System.Drawing.Graphics]::FromImage($fg)
$g3.SmoothingMode = 'HighQuality'
$g3.TextRenderingHint = 'AntiAliasGridFit'

$g3.Clear([System.Drawing.Color]::White)
$blackBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)

# Big B on left
$fontB = New-Object System.Drawing.Font("Arial", 260, [System.Drawing.FontStyle]::Bold)
$g3.DrawString("B", $fontB, $blackBrush, 120, 120, $fmt)

# Thin separator line
$g3.FillRectangle($blackBrush, 340, 60, 3, 380)

# Short description
$descFont = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Regular)
$descBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,60,60,60))
$g3.DrawString("Split group bills easily", $descFont, $descBrush, 400, 160)
$g3.DrawString("with friends.", $descFont, $descBrush, 400, 200)

$bottomFont = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Regular)
$bottomBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255,160,160,160))
$g3.DrawString("Bill Splitter", $bottomFont, $bottomBrush, 400, 280)

$g3.Dispose()
$fg.Save("$assetsDir\feature-graphic.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "  -> feature-graphic.png"

# === 4. SPLASH ICON ===
Write-Host "Generating splash icon..."
$splashBg = [System.Drawing.Color]::FromArgb(255,248,250,252)
$splash = New-Object System.Drawing.Bitmap(1284, 2778)
$g4 = [System.Drawing.Graphics]::FromImage($splash)
$g4.Clear($splashBg)
$iconSmall = $icon.GetThumbnailImage(400, 400, $null, [IntPtr]::Zero)
$g4.DrawImage($iconSmall, (1284-400)/2, (2778-400)/2, 400, 400)
$g4.Dispose()
$splash.Save("$assetsDir\splash-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
Write-Host "  -> splash-icon.png"

$icon.Dispose()
$adaptive.Dispose()
$fg.Dispose()
$splash.Dispose()
Write-Host "Done!"
