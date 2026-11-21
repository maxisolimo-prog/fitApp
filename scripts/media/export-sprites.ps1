param([string]$ManifestPath = ".cache/remaining-media-ready.json")
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationCore,WindowsBase,System.Drawing
$fitManifest = Get-Content -LiteralPath $ManifestPath -Encoding UTF8 -Raw | ConvertFrom-Json
$fitSourceDir = Join-Path $PWD '.cache/exercise-demo-sources'
$fitWorkDir = Join-Path $PWD '.cache/exercise-demo-frames'
$fitOutputDir = Join-Path $PWD 'public/exercise-demos'
New-Item -ItemType Directory -Force -Path $fitSourceDir,$fitWorkDir,$fitOutputDir | Out-Null
foreach ($fitTask in $fitManifest.entries) {
  Copy-Item -LiteralPath $fitTask.source -Destination (Join-Path $fitSourceDir ($fitTask.id + '.png'))
  $fitSheet = [System.Drawing.Image]::FromFile($fitTask.source)
  $fitCells = @()
  try {
    $fitCellWidth = [int]($fitSheet.Width / $fitTask.columns)
    $fitCellHeight = [int]($fitSheet.Height / $fitTask.rows)
    $fitCount = $fitTask.columns * $fitTask.rows
    for ($fitCell = 0; $fitCell -lt $fitCount; $fitCell++) {
      $fitLeft = ($fitCell % $fitTask.columns) * $fitCellWidth
      $fitTop = [int][Math]::Floor($fitCell / $fitTask.columns) * $fitCellHeight
      $fitWidth = $fitCellWidth
      $fitHeight = $fitCellHeight
      if ($fitTask.crop) {
        $fitLeft += $fitTask.crop[0]
        $fitTop += $fitTask.crop[1]
        $fitWidth = $fitTask.crop[2]
        $fitHeight = $fitTask.crop[3]
      }
      $fitScale = [Math]::Min(484 / $fitWidth, 484 / $fitHeight)
      $fitDrawWidth = [int]($fitWidth * $fitScale)
      $fitDrawHeight = [int]($fitHeight * $fitScale)
      $fitBitmap = [System.Drawing.Bitmap]::new(512,512)
      $fitGraphics = [System.Drawing.Graphics]::FromImage($fitBitmap)
      try {
        $fitGraphics.Clear([System.Drawing.Color]::White)
        $fitGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $fitRectangle = [System.Drawing.Rectangle]::new([int]((512 - $fitDrawWidth) / 2),[int]((512 - $fitDrawHeight) / 2),$fitDrawWidth,$fitDrawHeight)
        $fitGraphics.DrawImage($fitSheet,$fitRectangle,$fitLeft,$fitTop,$fitWidth,$fitHeight,[System.Drawing.GraphicsUnit]::Pixel)
        $fitCellPath = Join-Path $fitWorkDir ($fitTask.id + '-' + $fitCell + '.png')
        $fitBitmap.Save($fitCellPath,[System.Drawing.Imaging.ImageFormat]::Png)
        $fitBitmap.Save((Join-Path $fitWorkDir ($fitTask.id + '-' + $fitCell + '.jpg')),[System.Drawing.Imaging.ImageFormat]::Jpeg)
        if ($fitCell -eq 0) { $fitBitmap.Save((Join-Path $fitOutputDir ($fitTask.id + '.jpg')),[System.Drawing.Imaging.ImageFormat]::Jpeg) }
        $fitStream = [IO.File]::OpenRead($fitCellPath)
        try { $fitCells += [System.Windows.Media.Imaging.BitmapFrame]::Create($fitStream,[System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat,[System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad) }
        finally { $fitStream.Dispose() }
      } finally { $fitGraphics.Dispose(); $fitBitmap.Dispose() }
    }
    $fitSequence = @(0..($fitCount - 1))
    if ($fitTask.cycle -eq 'reverse') { $fitSequence += @(($fitCount - 2)..1) }
    $fitGif = [System.Windows.Media.Imaging.GifBitmapEncoder]::new()
    foreach ($fitCell in $fitSequence) { $fitGif.Frames.Add($fitCells[$fitCell]) }
    $fitFile = [IO.File]::Create((Join-Path $fitOutputDir ($fitTask.id + '.gif')))
    try { $fitGif.Save($fitFile) } finally { $fitFile.Dispose() }
    Write-Output ($fitTask.id + ' - ' + $fitSequence.Count + ' fotogramas')
  } finally { $fitSheet.Dispose() }
}
