param(
  [string]$SourcePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\branding\storehub-app-icon-source.png'),
  [string]$AndroidResRoot = (Join-Path (Split-Path -Parent $PSScriptRoot) 'android\app\src\main\res')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Image source introuvable : $SourcePath"
}

function Save-AndroidIcon {
  param(
    [System.Drawing.Bitmap]$Source,
    [int]$Size,
    [double]$LogoScale,
    [ValidateSet('square', 'round', 'transparent')]
    [string]$Background,
    [string]$OutputPath
  )

  $canvas = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $backgroundColor = [System.Drawing.ColorTranslator]::FromHtml('#FFF6E0')
    if ($Background -eq 'square') {
      $graphics.Clear($backgroundColor)
    } elseif ($Background -eq 'round') {
      $backgroundBrush = [System.Drawing.SolidBrush]::new($backgroundColor)
      try {
        $graphics.FillEllipse($backgroundBrush, 0, 0, $Size, $Size)
      } finally {
        $backgroundBrush.Dispose()
      }
    }

    $targetWidth = [int][Math]::Round($Size * $LogoScale)
    $targetHeight = [int][Math]::Round($targetWidth * $Source.Height / $Source.Width)
    if ($targetHeight -gt [int][Math]::Round($Size * $LogoScale)) {
      $targetHeight = [int][Math]::Round($Size * $LogoScale)
      $targetWidth = [int][Math]::Round($targetHeight * $Source.Width / $Source.Height)
    }

    $targetX = [int][Math]::Round(($Size - $targetWidth) / 2)
    $targetY = [int][Math]::Round(($Size - $targetHeight) / 2)
    $destination = [System.Drawing.Rectangle]::new($targetX, $targetY, $targetWidth, $targetHeight)
    $graphics.DrawImage($Source, $destination)

    $directory = Split-Path -Parent $OutputPath
    if (-not (Test-Path -LiteralPath $directory)) {
      New-Item -ItemType Directory -Path $directory -Force | Out-Null
    }
    $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $canvas.Dispose()
  }
}

$original = [System.Drawing.Bitmap]::FromFile($SourcePath)
try {
  $minX = $original.Width
  $minY = $original.Height
  $maxX = -1
  $maxY = -1

  # Icône = mascotte + boutique uniquement : le mot "StoreHub" (sous 65% de la hauteur) est illisible en petit.
  $markLimitY = [int][Math]::Floor($original.Height * 0.65)

  for ($y = 0; $y -lt $markLimitY; $y++) {
    for ($x = 0; $x -lt $original.Width; $x++) {
      if ($original.GetPixel($x, $y).A -gt 8) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    throw 'Le logo source ne contient aucun pixel visible.'
  }

  $padding = [int][Math]::Ceiling([Math]::Max($maxX - $minX + 1, $maxY - $minY + 1) * 0.04)
  $cropX = [Math]::Max(0, $minX - $padding)
  $cropY = [Math]::Max(0, $minY - $padding)
  $cropRight = [Math]::Min($original.Width - 1, $maxX + $padding)
  $cropBottom = [Math]::Min($markLimitY - 1, $maxY + $padding)
  $cropRectangle = [System.Drawing.Rectangle]::new(
    $cropX,
    $cropY,
    $cropRight - $cropX + 1,
    $cropBottom - $cropY + 1
  )

  $croppedLogo = [System.Drawing.Bitmap]::new($cropRectangle.Width, $cropRectangle.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $cropGraphics = [System.Drawing.Graphics]::FromImage($croppedLogo)
  try {
    $cropGraphics.Clear([System.Drawing.Color]::Transparent)
    $cropGraphics.DrawImage(
      $original,
      [System.Drawing.Rectangle]::new(0, 0, $croppedLogo.Width, $croppedLogo.Height),
      $cropRectangle,
      [System.Drawing.GraphicsUnit]::Pixel
    )
  } finally {
    $cropGraphics.Dispose()
  }

  # Or foncé (bronze) pour garder du contraste sur le fond ivoire.
  for ($y = 0; $y -lt $croppedLogo.Height; $y++) {
    for ($x = 0; $x -lt $croppedLogo.Width; $x++) {
      $pixel = $croppedLogo.GetPixel($x, $y)
      if ($pixel.A -gt 0) {
        $croppedLogo.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($pixel.A, [int]($pixel.R * 0.58), [int]($pixel.G * 0.50), [int]($pixel.B * 0.38)))
      }
    }
  }

  try {
    $densities = @(
      @{ Name = 'mdpi'; Legacy = 48; Foreground = 108 },
      @{ Name = 'hdpi'; Legacy = 72; Foreground = 162 },
      @{ Name = 'xhdpi'; Legacy = 96; Foreground = 216 },
      @{ Name = 'xxhdpi'; Legacy = 144; Foreground = 324 },
      @{ Name = 'xxxhdpi'; Legacy = 192; Foreground = 432 }
    )

    foreach ($density in $densities) {
      $directory = Join-Path $AndroidResRoot "mipmap-$($density.Name)"
      Save-AndroidIcon -Source $croppedLogo -Size $density.Legacy -LogoScale 0.80 -Background square -OutputPath (Join-Path $directory 'ic_launcher.png')
      Save-AndroidIcon -Source $croppedLogo -Size $density.Legacy -LogoScale 0.64 -Background round -OutputPath (Join-Path $directory 'ic_launcher_round.png')
      Save-AndroidIcon -Source $croppedLogo -Size $density.Foreground -LogoScale 0.56 -Background transparent -OutputPath (Join-Path $directory 'ic_launcher_foreground.png')
    }
  } finally {
    $croppedLogo.Dispose()
  }
} finally {
  $original.Dispose()
}

Write-Host 'Icônes Android StoreHub générées avec succès.'
